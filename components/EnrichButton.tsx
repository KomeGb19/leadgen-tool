"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { getStateName } from "@/lib/stateUtils";

export function EnrichButton({ onDone, stateCode = "WA" }: { onDone?: () => void; stateCode?: string }) {
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: stateCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Enrichment failed");
      push(`Enrichment complete — ${data.inserted} companies, ${data.matched} FMCSA matches`, "success");
      onDone?.();
    } catch (err) {
      push(err instanceof Error ? err.message : "Enrichment failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="amber" onClick={run} disabled={loading}>
      {loading ? `Scanning ${getStateName(stateCode)}...` : "Run lead discovery"}
    </Button>
  );
}
