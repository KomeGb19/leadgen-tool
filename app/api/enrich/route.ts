import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { searchPlaces, staticSatelliteUrl } from "@/lib/places";
import { searchCarrierByName, pickBestMatch } from "@/lib/fmcsa";
import { scoreLead } from "@/lib/scoring";

const QUERIES = ["septic tank pumping Seattle WA", "grease trap cleaning Seattle WA"];

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase isn't configured yet — running in demo mode on mock data. Add env vars to run the live pipeline." },
      { status: 400 }
    );
  }
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY is not set" }, { status: 400 });
  }

  const supabase = supabaseServer();
  let inserted = 0;
  let matched = 0;

  for (const q of QUERIES) {
    const places = await searchPlaces(q);

    for (const place of places) {
      const category = q.includes("septic") ? "septic" : "grease_trap";

      const { data: company } = await supabase
        .from("companies")
        .upsert(
          {
            name: place.name,
            address: place.address,
            city: "Seattle",
            state: "WA",
            lat: place.lat,
            lng: place.lng,
            phone: place.phone,
            website: place.website,
            source: "google_places",
            category,
            review_count: place.userRatingCount,
            rating: place.rating,
          },
          { onConflict: "name,address" }
        )
        .select()
        .single();

      if (!company) continue;
      inserted++;

      let fmcsa;
      try {
        const candidates = await searchCarrierByName(place.name);
        fmcsa = pickBestMatch(candidates, "Seattle");
      } catch {
        fmcsa = undefined; // FMCSA webkey missing or lookup failed — continue without it
      }

      if (fmcsa) {
        await supabase.from("fmcsa_records").upsert(
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
        matched++;
      }

      await supabase.from("imagery").upsert(
        {
          company_id: company.id,
          image_url: staticSatelliteUrl(place.lat, place.lng),
          source: "google_static",
          captured_date: new Date().toISOString().slice(0, 10),
        },
        { onConflict: "company_id" }
      );

      const score = scoreLead(
        { reviewCount: place.userRatingCount, rating: place.rating },
        fmcsa ? { powerUnits: fmcsa.totalPowerUnits, operatingStatus: fmcsa.statusCode } : undefined
      );

      await supabase
        .from("leads")
        .upsert({ company_id: company.id, score }, { onConflict: "company_id" });
    }
  }

  return NextResponse.json({ inserted, matched });
}
