import { NextResponse } from "next/server";
import { getUserPermissionsFromRequest } from "@/lib/auth-server";
import { searchCompanyOwnership } from "@/lib/exa";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 400 });
    }

    const userPermissions = await getUserPermissionsFromRequest(request);
    if (!userPermissions) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseServer();

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, city, state")
      .eq("id", params.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const companyState = (company.state ?? "").trim().toUpperCase();
    const hasAccess =
      userPermissions.isSuperUser ||
      (companyState !== "" && (userPermissions.allowedStates ?? []).includes(companyState));

    if (!hasAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const ownership = await searchCompanyOwnership(company.name, [company.city, company.state].filter(Boolean).join(", "));

    if (!ownership) {
      return NextResponse.json({
        ok: false,
        ownership: {
          ownership_status: "unknown",
          parent_company: null,
          acquisition_year: null,
          confidence: "low",
          sources: [],
        },
      });
    }

    const { error } = await supabase
      .from("companies")
      .update({
        ownership_status: ownership.ownership_status,
        parent_company: ownership.parent_company,
        acquisition_year: ownership.acquisition_year,
        confidence: ownership.confidence,
        sources: ownership.sources ?? [],
        ownership_researched_at: new Date().toISOString(),
      })
      .eq("id", company.id);

    if (error) {
      console.error("[ownership] update error:", error);

      const message = String((error as any)?.message || "");
      if (
        message.includes("Could not find the '") &&
        message.includes("column") &&
        message.includes("companies")
      ) {
        return NextResponse.json(
          {
            error:
              "The companies table is missing the ownership migration. Run the SQL in supabase/migrations/2026_10_22_add_ownership_fields.sql.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ownership });
  } catch (error) {
    console.error("[ownership] research failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ownership research failed" },
      { status: 500 }
    );
  }
}
