"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export function SideRail() {
  const pathname = usePathname();
  const { user, logout, isSuperUser } = useAuth();

  const baseNav = [
    { href: "/", label: "Dashboard" },
    { href: "/leads", label: "Leads" },
    { href: "/import", label: "Import" },
  ];

  const navItems = isSuperUser()
    ? [...baseNav, { href: "/settings", label: "Settings" }]
    : baseNav;

  return (
    <aside className="flex h-full fixed w-56 flex-shrink-0 flex-col border-r border-line bg-rail">
      <div className="border-b border-line px-4 py-5">
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-amber">
          Manifest
        </div>
        <div className="font-display text-xl uppercase text-paper">
          Hauler Leads
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 p-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors",
                active
                  ? "bg-amber/10 text-amber"
                  : "text-muted hover:bg-panel hover:text-paper",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line px-4 py-4">
        <div className="font-mono text-[10px] uppercase tracking-wide text-muted">
          Region
        </div>
        <div className="text-sm text-paper">United States</div>
        <div className="mt-1 font-mono text-[10px] text-muted">
          Septic · Grease trap
        </div>

        {user && (
          <>
            <div className="mb-2 mt-6 text-xs font-mono text-amber">
              {user.email ?? user.id?.slice(0, 8) ?? "User"}
            </div>

            <div className="bg-panel">
              <button
                onClick={async () => {
                  try {
                    await logout();
                    // Reload to show login modal
                    window.location.reload();
                  } catch (err) {
                    console.error("Logout failed:", err);
                  }
                }}
                className="w-full hover:text-amber p-2 text-left text-xs font-mono text-muted flex justify-between "
              >
                Logout
                <LogOut size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
