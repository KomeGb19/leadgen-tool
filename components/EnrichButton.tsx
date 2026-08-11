"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

export function EnrichButton({ onDone }: { onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/enrich", { method: "POST" });
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
      {loading ? "Scanning Washington..." : "Run lead discovery"}
    </Button>
  );
}
