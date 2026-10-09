import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { getUserPermissionsFromRequest } from "@/lib/auth-server";

const VALID_STATUSES = ["new", "contacted", "qualified", "won", "lost"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();

  if (!isSupabaseConfigured()) {
    // Demo mode: nothing persists server-side, the UI already updated optimistically.
    return NextResponse.json({ ok: true, mode: "mock" });
  }

  // Authenticate
  const userPermissions = await getUserPermissionsFromRequest(req);
  if (!userPermissions) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseServer();

  // The id in the URL is the company id (same as the original route used).
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, state")
    .eq("id", params.id)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Authorize by the company's state
  const companyState = (company.state ?? "").trim().toUpperCase();
  const hasAccess =
    userPermissions.isSuperUser ||
    (companyState !== "" &&
      (userPermissions.allowedStates ?? []).includes(companyState));

  if (!hasAccess) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (body.status) {
    const { error } = await supabase
      .from("leads")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("company_id", company.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.note) {
    const { error } = await supabase.from("lead_notes").insert({
      company_id: company.id,
      body: body.note,
      author: body.author ?? "You",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: "supabase" });
}