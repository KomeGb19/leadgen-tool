import type { Metadata } from "next";
import "./globals.css";
import { SideRail } from "@/components/SideRail";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Hauler Lead Finder — Seattle Septic & Grease",
  description: "Lead sourcing dashboard for septic and grease-trap haulers in Seattle, WA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="flex">
            <SideRail />
            <main className="min-h-screen flex-1 overflow-x-hidden">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
