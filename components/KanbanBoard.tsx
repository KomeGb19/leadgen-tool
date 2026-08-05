"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/ScoreRing";
import { fleetSize } from "@/lib/filters";
import type { Lead, LeadStatus } from "@/lib/types";

const COLUMNS: { key: LeadStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export function KanbanBoard({
  leads,
  onSelect,
  onStatusChange,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}) {
  const [dragOverCol, setDragOverCol] = useState<LeadStatus | null>(null);

  return (
    <div className="grid grid-cols-5 gap-3">
      {COLUMNS.map((col) => {
        const items = leads.filter((l) => l.status === col.key);
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.key);
            }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => {
              e.preventDefault();
              const leadId = e.dataTransfer.getData("text/lead-id");
              if (leadId) onStatusChange(leadId, col.key);
              setDragOverCol(null);
            }}
            className={`flex min-h-[400px] flex-col gap-2 rounded border p-2 transition-colors ${
              dragOverCol === col.key
                ? "border-amber bg-amber/5"
                : "border-line bg-rail/40"
            }`}
          >
            <div className="flex items-center justify-between px-1 py-1">
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                {col.label}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {items.length}
              </span>
            </div>

            {items.map((lead) => (
              <div
                key={lead.id}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/lead-id", lead.id)
                }
                onClick={() => onSelect(lead)}
                className="cursor-grab rounded border border-line bg-panel p-2.5 active:cursor-grabbing hover:border-muted"
              >
                <div className="mb-1.5 truncate font-body text-xs text-paper">
                  {lead.company.name}
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{fleetSize(lead)} trucks</Badge>
                  <ScoreBadge score={lead.score} />
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="flex flex-1 items-center justify-center rounded border border-dashed border-line/60 py-6 text-center text-[11px] text-muted">
                Drop a lead here
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
