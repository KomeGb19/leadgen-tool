import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getUserPermissionsFromRequest } from "@/lib/auth-server";

export async function GET(request: Request) {
  const requesterPermissions = await getUserPermissionsFromRequest(request);
  if (!requesterPermissions || !requesterPermissions.isSuperUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = supabaseServer();

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error("[settings] Error fetching users:", usersError);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  const { data: permissionsData, error: permissionsError } = await supabase
    .from("user_state_permissions")
    .select("user_id, state_code, user_roles!inner(name)");

  if (permissionsError) {
    console.error("[settings] Error fetching permissions:", permissionsError);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }

  const roleName = (r: any): string | undefined =>
    Array.isArray(r) ? r[0]?.name : r?.name;

  const permissionsByUserId: Record<string, { role: string; stateCode: string | null }[]> = {};
  (permissionsData ?? []).forEach((perm: any) => {
    const list = (permissionsByUserId[perm.user_id] ??= []);
    list.push({ role: roleName(perm.user_roles) ?? "", stateCode: perm.state_code ?? null });
  });

  const users = usersData.users.map((user) => {
    const perms = permissionsByUserId[user.id] ?? [];
    let role: "super_user" | "state_user" | null = null;
    let allowedStates: string[] | null = null;

    if (perms.some((p) => p.role === "super_user")) {
      role = "super_user";
      allowedStates = null;
    } else {
      const stateUserPerms = perms.filter((p) => p.role === "state_user");
      if (stateUserPerms.length > 0) {
        role = "state_user";
        allowedStates = [
          ...new Set(stateUserPerms.map((p) => p.stateCode).filter((s): s is string => s !== null)),
        ].sort();
      }
    }

    return { id: user.id, email: user.email ?? "", role, allowedStates };
  });

  return NextResponse.json({ users });
}