"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FiltersBar, DEFAULT_FILTERS } from "@/components/FiltersBar";
import { LeadsTable } from "@/components/LeadsTable";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { EnrichButton } from "@/components/EnrichButton";
import { useLeads } from "@/lib/useLeads";
import { applyFilters } from "@/lib/filters";
import { US_STATES } from "@/lib/stateUtils";
import type { Lead, LeadFilters } from "@/lib/types";

export default function LeadsPage() {
  const { leads, loading, source, refresh, updateStatus, addNote } = useLeads();
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState<string>("WA");

  const filtered = useMemo(
    () => applyFilters(leads, filters),
    [leads, filters],
  );

  return (
    <div className="flex flex-col gap-4 p-6 ml-60">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Pipeline
          </div>
          <h1 className="font-display text-3xl uppercase text-paper">Leads</h1>
        </div>
        <div className="flex items-center gap-2">
          {source === "mock" && (
            <Badge variant="warn">Demo data — Supabase not connected</Badge>
          )}
          <div className="flex overflow-hidden rounded border border-line">
            <Button
              variant={view === "table" ? "amber" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("table")}
            >
              Table
            </Button>
            <Button
              variant={view === "kanban" ? "amber" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("kanban")}
            >
              Pipeline
            </Button>
          </div>
          <Select
            value={selectedStateCode}
            onChange={(e) => setSelectedStateCode(e.target.value)}
            className="min-w-[120px]"
          >
            <option value="all">All States</option>
            {US_STATES.map(state => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </Select>
          <EnrichButton onDone={refresh} stateCode={selectedStateCode} />
        </div>
      </div>

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
        filteredLeads={filtered}
      />

      {loading ? (
        <div className="py-24 text-center font-mono text-xs text-muted">
          Loading leads...
        </div>
      ) : view === "table" ? (
        <LeadsTable leads={filtered} onSelect={setSelected} />
      ) : (
        <KanbanBoard
          leads={filtered}
          onSelect={setSelected}
          onStatusChange={updateStatus}
        />
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