"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatsCards } from "@/components/StatsCards";
import { LeadMapClient } from "@/components/LeadMapClient";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { ScoreBadge } from "@/components/ScoreRing";
import { EnrichButton } from "@/components/EnrichButton";
import { useLeads } from "@/lib/useLeads";
import { fleetSize } from "@/lib/filters";
import { US_STATES } from "@/lib/stateUtils";
import { Spinner } from "@/components/ui/spinner";
import type { Lead } from "@/lib/types";

export default function DashboardPage() {
  const {
    leads,
    loading,
    source,
    refresh,
    updateStatus,
    addNote,
    researchOwnership,
    researchHotLeads,
  } = useLeads();
  const [selected, setSelected] = useState<Lead | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState<string>("WA");
  const searchParams = useSearchParams();

  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    const type = searchParams.get("type");
    if (token && type === "invite") {
      const supabase = supabaseBrowser();
      // Using 'any' type to workaround potential type definition issues with verifyOtp for invite type
      supabase.auth
        .verifyOtp({ token, type: "invite" } as any)
        .then(({ error }) => {
          if (error) {
            console.error("Invite verification error:", error);
          } else {
            // Remove query params to avoid reuse
            window.history.replaceState(null, "", window.location.pathname);
            // Refresh the route to refetch data and update UI
            router.refresh();
          }
        });
    }
  }, [searchParams]);

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
          <Select
            value={selectedStateCode}
            onChange={(e) => setSelectedStateCode(e.target.value)}
            className="min-w-[120px]"
          >
            <option value="all">All States</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </Select>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={researchHotLeads}
            disabled={loading || leads.filter((lead) => lead.score >= 80).length === 0}
          >
            Research hot leads
          </Button> */}
          <EnrichButton onDone={refresh} stateCode={selectedStateCode} />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Spinner className="h-8 w-8 text-muted" />
        </div>
      ) : (
        <>
          <StatsCards />

          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Lead map</CardTitle>
                <span className="font-mono text-[11px] text-muted">
                  {leads.length} pins
                </span>
              </CardHeader>
              <CardContent className="h-[420px] p-2 pt-2">
                <LeadMapClient onSelect={setSelected} />
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
        onResearchOwnership={researchOwnership}
      />
    </div>
  );
}
