"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCards } from "@/components/StatsCards";
import { LeadMapClient } from "@/components/LeadMapClient";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { ScoreBadge } from "@/components/ScoreRing";
import { EnrichButton } from "@/components/EnrichButton";
import { useLeads } from "@/lib/useLeads";
import { fleetSize } from "@/lib/filters";
import type { Lead } from "@/lib/types";

export default function DashboardPage() {
  const { leads, loading, source, refresh, updateStatus, addNote } = useLeads();
  const [selected, setSelected] = useState<Lead | null>(null);

  const topLeads = [...leads].sort((a, b) => b.score - a.score).slice(0, 6);

  return (
    <div className="flex flex-col gap-5 p-6 ml-60">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Overview
          </div>
          <h1 className="font-display text-3xl uppercase text-paper">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {source === "mock" && (
            <Badge variant="warn">Demo data — Supabase not connected</Badge>
          )}
          <EnrichButton onDone={refresh} />
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center font-mono text-xs text-muted">
          Loading leads...
        </div>
      ) : (
        <>
          <StatsCards leads={leads} />

          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Lead map</CardTitle>
                <span className="font-mono text-[11px] text-muted">
                  {leads.length} pins
                </span>
              </CardHeader>
              <CardContent className="h-[420px] p-2 pt-2">
                <LeadMapClient leads={leads} onSelect={setSelected} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top leads</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {topLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="flex items-center justify-between rounded border border-line bg-ink px-3 py-2 text-left hover:border-muted"
                  >
                    <div>
                      <div className="text-sm text-paper">
                        {lead.company.name}
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        {fleetSize(lead)} trucks
                      </div>
                    </div>
                    <ScoreBadge score={lead.score} />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <LeadDetailSheet
        lead={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onStatusChange={updateStatus}
        onAddNote={addNote}
      />
    </div>
  );
}
