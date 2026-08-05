import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (!isSupabaseConfigured()) {
    // Demo mode: nothing persists server-side, the UI already updated optimistically.
    return NextResponse.json({ ok: true, mode: "mock" });
  }

  const supabase = supabaseServer();

  if (body.status) {
    const { error } = await supabase
      .from("leads")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("company_id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.note) {
    const { error } = await supabase.from("lead_notes").insert({
      company_id: params.id,
      body: body.note,
      author: body.author ?? "You",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: "supabase" });
}
