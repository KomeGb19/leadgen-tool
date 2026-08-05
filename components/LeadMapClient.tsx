"use client";

import dynamic from "next/dynamic";
import type { Lead } from "@/lib/types";

const LeadMap = dynamic(() => import("./LeadMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
      Loading map...
    </div>
  ),
});

export function LeadMapClient({
  leads,
  onSelect,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
}) {
  return (
    <div className="relative isolate z-0 h-full w-full overflow-hidden rounded">
      <LeadMap leads={leads} onSelect={onSelect} />
    </div>
  );
}
