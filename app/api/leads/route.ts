import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { mockLeads } from "@/lib/mock-data";
import { scoreLead } from "@/lib/scoring";
import type { Lead } from "@/lib/types";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ leads: mockLeads, source: "mock" });
  }

  const supabase = supabaseServer();
  const { data: companies, error } = await supabase
    .from("companies")
    .select("*, fmcsa_records(*), imagery(*), leads(*), lead_notes(*)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads: Lead[] = (companies ?? []).map((c: any) => {
    const fmcsaRow = c.fmcsa_records?.[0];
    const imageryRow = c.imagery?.[0];
    const leadRow = c.leads?.[0];

    const fmcsa = fmcsaRow && {
      usdotNumber: fmcsaRow.usdot_number,
      mcNumber: fmcsaRow.mc_number,
      powerUnits: fmcsaRow.power_units,
      drivers: fmcsaRow.drivers,
      operatingStatus: fmcsaRow.operating_status,
      mcs150Date: fmcsaRow.mcs150_date,
    };
    const imagery = imageryRow && {
      imageUrl: imageryRow.image_url,
      capturedDate: imageryRow.captured_date,
      source: imageryRow.source,
      truckCountEstimate: imageryRow.truck_count_estimate,
    };

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
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      updatedAt: leadRow?.updated_at ?? c.created_at,
    };
  });

  return NextResponse.json({ leads, source: "supabase" });
}
