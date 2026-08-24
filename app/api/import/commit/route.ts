import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/geocode";
import { searchCarrierByName, pickBestMatch } from "@/lib/fmcsa";
import { scoreLead } from "@/lib/scoring";
import { toAppCategory } from "@/lib/types";
import type { ParsedRow } from "@/lib/types";

// Runs `limit` rows at a time instead of one-at-a-time — cuts a 56-row
// import from ~2 minutes down to a few seconds without hitting API rate limits.
async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

interface RowResult {
  status: "inserted" | "skipped";
  reason?: string;
  companyName: string;
  fmcsaMatched: boolean;
  geocoded: boolean;
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase isn't configured — see .env.example" }, { status: 400 });
  }

  const { rows }: { rows: ParsedRow[]; sourceLabel: string } = await req.json();
  const supabase = supabaseServer();

  const results = await pool(rows, 8, async (row): Promise<RowResult> => {
    if (!row.include || !row.companyName || !row.address) {
      return { status: "skipped", reason: "excluded or missing name/address", companyName: row.companyName, fmcsaMatched: false, geocoded: false };
    }

    const fullAddress = [row.address, row.city, row.state ?? "WA", row.zip].filter(Boolean).join(", ");
    const geo = await geocodeAddress(fullAddress).catch((err) => {
      console.error(`[import] geocode failed for "${row.companyName}":`, err);
      return null;
    });

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .upsert(
        {
          name: row.companyName,
          address: row.address,
          ...(row.city ? { city: row.city } : {}),
          state: row.state ?? "WA",
          zip: row.zip,
          phone: row.phone,
          lat: geo?.lat,
          lng: geo?.lng,
          source: "hauler_registry",
          category: toAppCategory(row.categories),
        },
        { onConflict: "name,address" }
      )
      .select()
      .single();

    if (companyError || !company) {
      console.error(`[import] companies upsert failed for "${row.companyName}":`, companyError);
      return { status: "skipped", reason: companyError?.message ?? "unknown upsert error", companyName: row.companyName, fmcsaMatched: false, geocoded: Boolean(geo) };
    }

    let fmcsa;
    try {
      const candidates = await searchCarrierByName(row.companyName);
      fmcsa = pickBestMatch(candidates, row.city ?? "");
    } catch (err) {
      console.error(`[import] FMCSA lookup failed for "${row.companyName}":`, err);
      fmcsa = undefined;
    }

    if (fmcsa) {
      const { error: fmcsaError } = await supabase.from("fmcsa_records").upsert(
        {
          company_id: company.id,
          usdot_number: fmcsa.dotNumber,
          power_units: fmcsa.totalPowerUnits,
          drivers: fmcsa.totalDrivers,
          operating_status: fmcsa.statusCode,
          mcs150_date: fmcsa.mcs150Date,
        },
        { onConflict: "company_id" }
      );
      if (fmcsaError) console.error(`[import] fmcsa_records upsert failed for "${row.companyName}":`, fmcsaError);
    }

    const score = scoreLead(
      { reviewCount: undefined, rating: undefined, yearsInBusiness: undefined },
      fmcsa ? { powerUnits: fmcsa.totalPowerUnits, operatingStatus: fmcsa.statusCode } : undefined
    );

    const { error: leadError } = await supabase
      .from("leads")
      .upsert({ company_id: company.id, score }, { onConflict: "company_id" });
    if (leadError) console.error(`[import] leads upsert failed for "${row.companyName}":`, leadError);

    return { status: "inserted", companyName: row.companyName, fmcsaMatched: Boolean(fmcsa), geocoded: Boolean(geo) };
  });

  const inserted = results.filter((r) => r.status === "inserted").length;
  const skipped = results.filter((r) => r.status === "skipped");
  const fmcsaMatched = results.filter((r) => r.fmcsaMatched).length;
  const geocodeFailed = results.filter((r) => r.status === "inserted" && !r.geocoded).length;

  if (skipped.length) {
    console.warn(`[import] ${skipped.length} rows skipped:`, skipped.map((s) => `${s.companyName}: ${s.reason}`));
  }

  return NextResponse.json({
    inserted,
    skipped: skipped.length,
    skippedDetails: skipped.map((s) => ({ companyName: s.companyName, reason: s.reason })),
    fmcsaMatched,
    geocodeFailed,
  });
}