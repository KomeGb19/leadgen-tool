import { supabaseServer } from "@/lib/supabase";
import type { UserPermissions } from "@/lib/types";

export async function getUserPermissionsFromRequest(
  request: Request
): Promise<UserPermissions | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const admin = supabaseServer();

  // Verifies the JWT with Supabase Auth
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return null;

  const { data, error } = await admin
    .from("user_state_permissions")
    .select("state_code, user_roles!inner(name)")
    .eq("user_id", user.id);

  if (error) {
    console.error("[auth] permissions lookup failed:", error);
    return null;
  }
  if (!data?.length) return null;

  const roleName = (r: any): string | undefined =>
    Array.isArray(r.user_roles) ? r.user_roles[0]?.name : r.user_roles?.name;

  if (data.some((r) => roleName(r) === "super_user")) {
    return { isSuperUser: true, role: "super_user", allowedStates: null };
  }

  const allowedStates = data
    .filter((r) => roleName(r) === "state_user" && r.state_code)
    .map((r) => String(r.state_code).trim().toUpperCase());

  return allowedStates.length
    ? { isSuperUser: false, role: "state_user", allowedStates }
    : null;
}