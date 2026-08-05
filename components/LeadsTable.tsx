"use client";

import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/ScoreRing";
import { fleetSize } from "@/lib/filters";
import { formatRelative } from "@/lib/utils";
import type { Lead } from "@/lib/types";

const statusVariant = {
  new: "outline",
  contacted: "info",
  qualified: "amber",
  won: "ok",
  lost: "danger",
} as const;

const sourceLabel: Record<string, string> = {
  fmcsa: "FMCSA",
  google_places: "Places",
  hauler_registry: "Registry",
  manual: "Manual",
};

export function LeadsTable({
  leads,
  onSelect,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded border border-dashed border-line py-16 text-center">
        <p className="font-display text-lg text-paper">
          No leads match these filters
        </p>
        <p className="text-sm text-muted">
          Widen the fleet size range or clear a filter to see more.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-line">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-rail text-left font-mono text-[11px] uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Fleet</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onSelect(lead)}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-rail/60"
            >
              <td className="px-4 py-3">
                <div className="font-body text-paper hover:underline h">{lead.company.name}</div>
                <div className="font-mono text-[11px] text-muted">
                  {lead.company.address}
                </div>
              </td>
              <td className="px-4 py-3 text-muted capitalize">
                {lead.company.category.replace("_", " ")}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-paper">{fleetSize(lead)}</span>
                <span className="ml-1 text-[11px] text-muted">
                  {lead.fmcsa ? "verified" : "est."}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">
                  {sourceLabel[lead.company.source]}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <ScoreBadge score={lead.score} />
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant[lead.status]}>
                  {lead.status}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-[11px] text-muted">
                {formatRelative(lead.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
