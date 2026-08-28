"use client";

import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/ScoreRing";
import { fleetSize } from "@/lib/filters";
import { formatRelative } from "@/lib/utils";
import type { Lead } from "@/lib/types";
import { useState, useEffect } from "react";

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
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 20;

  // Adjust currentPage if it goes out of bounds when leads change
  useEffect(() => {
    const totalPages = Math.ceil(leads.length / leadsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (leads.length === 0) {
      setCurrentPage(1);
    }
  }, [leads, leadsPerPage, currentPage]);

  // Calculate paginated leads
  const totalLeads = leads.length;
  const totalPages = Math.ceil(totalLeads / leadsPerPage);
  const paginatedLeads = leads.slice(
    (currentPage - 1) * leadsPerPage,
    currentPage * leadsPerPage,
  );

  if (totalLeads === 0) {
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
    <>
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
            {paginatedLeads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelect(lead)}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-rail/60"
              >
                <td className="px-4 py-3">
                  <div className="font-body text-paper hover:underline h">
                    {lead.company.name}
                  </div>
                  <div className="font-mono text-[11px] text-muted">
                    {lead.company.address}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted capitalize">
                  {lead.company.category.replace("_", " ")}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-paper">
                    {fleetSize(lead)}
                  </span>
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-3 text-sm text-muted">
        <span>
          Showing {(currentPage - 1) * leadsPerPage + 1}-
          {Math.min(currentPage * leadsPerPage, totalLeads)} of {totalLeads}{" "}
          leads
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex h-9 w-9 items-center justify-center rounded-border border-line hover:bg-rail/60 disabled:opacity-50"
          >
            <span className="sr-only">Previous page</span>
            {/* Using a simple unicode character for left arrow, you can replace with an icon if available */}
            ‹
          </button>

          {/* Page numbers - showing all pages for simplicity, assuming not too many pages */}
          {/* For large number of pages, consider implementing a more compact pagination */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                className={`flex h-9 w-9 items-center justify-center rounded-border border-line ${currentPage === pageNumber ? "bg-accent text-accent-foreground" : "hover:bg-rail/60"}`}
              >
                {pageNumber}
              </button>
            ),
          )}

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-border border-line hover:bg-rail/60 disabled:opacity-50"
          >
            <span className="sr-only">Next page</span>›
          </button>
        </div>
      </div>
    </>
  );
}
