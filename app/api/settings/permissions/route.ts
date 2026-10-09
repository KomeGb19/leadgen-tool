import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getUserPermissionsFromRequest } from "@/lib/auth-server";

type PermissionRow = { user_id: string; role_id: string; state_code: string | null };

async function roleIdFor(supabase: ReturnType<typeof supabaseServer>, name: "super_user" | "state_user") {
  const { data, error } = await supabase.from("user_roles").select("id").eq("name", name).single();
  if (error || !data) throw new Error(`Role "${name}" not found — run the role-seeding SQL once`);
  return data.id as string;
}

export async function POST(request: Request) {
  const requesterPermissions = await getUserPermissionsFromRequest(request);
  if (!requesterPermissions || !requesterPermissions.isSuperUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = supabaseServer();

  try {
    const { userId, role, stateCodes } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: "Missing userId or role" }, { status: 400 });
    }
    if (role !== "super_user" && role !== "state_user") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (role === "state_user" && (!Array.isArray(stateCodes) || stateCodes.length === 0)) {
      return NextResponse.json({ error: "State codes required for state_user role" }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("user_state_permissions")
      .delete()
      .eq("user_id", userId);
    if (deleteError) throw deleteError;

    const permissionsToInsert: PermissionRow[] =
      role === "super_user"
        ? [{ user_id: userId, role_id: await roleIdFor(supabase, "super_user"), state_code: null }]
        : await (async () => {
            const roleId = await roleIdFor(supabase, "state_user");
            const seen = new Set<string>();
            return (stateCodes as string[])
              .map((s) => s.toUpperCase().trim())
              .filter((s) => s && !seen.has(s) && seen.add(s))
              .map((state_code) => ({ user_id: userId, role_id: roleId, state_code }));
          })();

    const { error: insertError } = await supabase
      .from("user_state_permissions")
      .insert(permissionsToInsert);
    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[settings] Error updating permissions:", err);
    return NextResponse.json({ error: err.message || "Failed to update permissions" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const requesterPermissions = await getUserPermissionsFromRequest(request);
  if (!requesterPermissions || !requesterPermissions.isSuperUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = supabaseServer();

  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const { error } = await supabase.from("user_state_permissions").delete().eq("user_id", userId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[settings] Error deleting permissions:", err);
    return NextResponse.json({ error: err.message || "Failed to delete permissions" }, { status: 500 });
  }
}