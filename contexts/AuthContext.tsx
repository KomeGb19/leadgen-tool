"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  signInWithEmail,
  signOut,
  supabaseBrowser,
  getUserPermissions,
} from "@/lib/auth";
import { Spinner } from "@/components/ui/spinner";
import type { UserPermissions } from "@/lib/types";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  userPermissions: UserPermissions | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isSuperUser: () => boolean;
  /** null = all states (super user) */
  getAllowedStates: () => string[] | null;
  hasStateAccess: (stateCode: string) => boolean;
}

const AuthCtx = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userPermissions, setUserPermissions] =
    useState<UserPermissions | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let cancelled = false;

    const sync = async (nextUser: any | null) => {
      if (cancelled) return;
      setUser(nextUser);
      if (!nextUser) {
        setUserPermissions(null);
        return;
      }
      try {
        const permissions = await getUserPermissions();
        if (!cancelled) setUserPermissions(permissions);
      } catch (err) {
        console.error("Failed to load permissions:", err);
        if (!cancelled) setUserPermissions(null);
      }
    };

    // Initial load
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => sync(session?.user ?? null))
      .catch((err) => console.error("Failed to load session:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Later changes (sign in / sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      // Don't await Supabase calls inside this callback (can deadlock the auth client)
      setTimeout(() => sync(session?.user ?? null), 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await signInWithEmail(email, password);
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading: false,
      userPermissions,
      login,
      logout,
      isSuperUser: () => userPermissions?.isSuperUser ?? false,
      getAllowedStates: () =>
        userPermissions?.isSuperUser
          ? null
          : (userPermissions?.allowedStates ?? []),
      hasStateAccess: (stateCode: string) => {
        if (userPermissions?.isSuperUser) return true;
        return (
          userPermissions?.allowedStates?.includes(stateCode.toUpperCase()) ??
          false
        );
      },
    }),
    [user, userPermissions, login, logout],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-amber" />
      </div>
    );
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
