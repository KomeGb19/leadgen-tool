"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { useEffect } from "react";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Handle modal visibility on route changes
  useEffect(() => {
    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  return (
    <>
      {!user && !loading ? (
        <AuthModal
          onClose={() => {
            // Don't actually close - keep modal visible until login
            // In a real app, you might redirect to login page instead
          }}
        />
      ) : (
        <>
          <div className={`${!user && !loading ? "blur-sm" : ""}`}>
            {children}
          </div>
        </>
      )}
    </>
  );
}