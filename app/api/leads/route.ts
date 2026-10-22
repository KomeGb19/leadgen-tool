import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { mockLeads } from "@/lib/mock-data";
import { scoreLead } from "@/lib/scoring";
import { getUserPermissionsFromRequest } from "@/lib/auth-server";
import type { Lead } from "@/lib/types";

// PostgREST returns a single object for a to-one embed (the child's FK is
// unique), and an array for a to-many embed. Normalize both to "one row".
function one<T>(x: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(x)) return x[0];
  return x ?? undefined;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ leads: mockLeads, source: "mock" });
  }

  const userPermissions = await getUserPermissionsFromRequest(request);
  if (!userPermissions) {
    return NextResponse.json({ leads: [], source: "supabase" });
  }

  const supabase = supabaseServer();

  let query = supabase
    .from("companies")
    .select(`
      *,
      fmcsa_records(*),
      imagery(*),
      leads(*),
      lead_notes(*)
    `);

  if (!userPermissions.isSuperUser && userPermissions.allowedStates !== null) {
    query = query.in("state", userPermissions.allowedStates);
  }

  const { data: companies, error } = await query;

  if (error) {
    console.error("[leads] error fetching companies:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }

  const leads: Lead[] = (companies ?? []).map((c: any) => {
    const fmcsaRow = one<any>(c.fmcsa_records);
    const imageryRow = one<any>(c.imagery);
    const leadRow = one<any>(c.leads);

    const fmcsa =
      fmcsaRow && fmcsaRow.usdot_number != null
        ? {
            usdotNumber: fmcsaRow.usdot_number,
            mcNumber: fmcsaRow.mc_number ?? undefined,
            powerUnits: fmcsaRow.power_units ?? undefined,
            drivers: fmcsaRow.drivers ?? undefined,
            operatingStatus: fmcsaRow.operating_status ?? undefined,
            cargoTypes: fmcsaRow.cargo_types ?? undefined,
            mcs150Date: fmcsaRow.mcs150_date ?? undefined,
          }
        : undefined;

    const imagery = imageryRow
      ? {
          imageUrl: imageryRow.image_url ?? undefined,
          capturedDate: imageryRow.captured_date ?? undefined,
          source: imageryRow.source ?? undefined,
          truckCountEstimate: imageryRow.truck_count_estimate ?? undefined,
        }
      : undefined;

    const company = {
      id: c.id,
      name: c.name,
      dba: c.dba,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      lat: c.lat,
      lng: c.lng,
      phone: c.phone,
      website: c.website,
      source: c.source,
      category: c.category ?? "both",
      yearsInBusiness: c.years_in_business,
      reviewCount: c.review_count,
      rating: c.rating,
      ownershipStatus: c.ownership_status ?? undefined,
      parentCompany: c.parent_company ?? null,
      acquisitionYear: c.acquisition_year ?? null,
      ownershipConfidence: c.confidence ?? undefined,
      ownershipSources: Array.isArray(c.sources) ? c.sources : [],
      ownershipResearchedAt: c.ownership_researched_at ?? undefined,
    };

    return {
      id: c.id,
      company,
      fmcsa,
      imagery,
      score: leadRow?.score ?? scoreLead(company, fmcsa, imagery),
      status: leadRow?.status ?? "new",
      notes: (c.lead_notes ?? [])
        .map((n: any) => ({ id: n.id, body: n.body, author: n.author, createdAt: n.created_at }))
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      updatedAt: leadRow?.updated_at ?? c.created_at,
    };
  });

  return NextResponse.json({ leads, source: "supabase" });
}