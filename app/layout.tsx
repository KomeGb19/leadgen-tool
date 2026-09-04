import type { Metadata } from "next";
import "./globals.css";
import { SideRail } from "@/components/SideRail";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthWrapper } from "@/components/AuthWrapper";

export const metadata: Metadata = {
  title: "Hauler Lead Finder — Washington Septic & Grease",
  description:
    "Lead sourcing dashboard for septic and grease-trap haulers in Washington State.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>
            <div className="flex">
              <SideRail />
              <main className="min-h-screen flex-1 overflow-x-hidden">
                <AuthWrapper>{children}</AuthWrapper>
              </main>
            </div>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}