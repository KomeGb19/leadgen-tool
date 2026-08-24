"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { useState } from "react";
import type { LeadFilters, Lead } from "@/lib/types";
import { exportLeadsToCsv, exportLeadsToExcel } from "@/lib/export";
import { US_STATES } from "@/lib/utils";

export const DEFAULT_FILTERS: LeadFilters = {
  query: "",
  minFleetSize: 0,
  maxFleetSize: 30,
  category: "all",
  status: "all",
  source: "all",
  state: "all",
  sortBy: "score",
  sortDir: "desc",
};

export interface FiltersBarProps {
  filters: LeadFilters;
  onChange: (f: LeadFilters) => void;
  resultCount: number;
  filteredLeads: Lead[];
}

export function FiltersBar({
  filters,
  onChange,
  resultCount,
  filteredLeads,
}: FiltersBarProps) {
  const { push } = useToast();
  const [csvLoading, setCsvLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  function set<K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const handleExportCsv = async () => {
    setCsvLoading(true);
    try {
      exportLeadsToCsv(filteredLeads, "filtered_leads");
      push("Leads exported to CSV successfully", "success");
    } catch (error) {
      push(
        `Failed to export CSV: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
    } finally {
      setCsvLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExcelLoading(true);
    try {
      await exportLeadsToExcel(filteredLeads, "filtered_leads");
      push("Leads exported to Excel successfully", "success");
    } catch (error) {
      push(
        `Failed to export Excel: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded border border-line bg-panel p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search company, address, DOT#..."
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
          className="max-w-xs"
        />

        <Select
          value={filters.category}
          onChange={(e) =>
            set("category", e.target.value as LeadFilters["category"])
          }
        >
          <option value="all">All categories</option>
          <option value="septic">Septic</option>
          <option value="grease_trap">Grease trap</option>
          <option value="both">Both</option>
        </Select>

        <Select
          value={filters.status}
          onChange={(e) =>
            set("status", e.target.value as LeadFilters["status"])
          }
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </Select>

        <Select
          value={filters.source}
          onChange={(e) =>
            set("source", e.target.value as LeadFilters["source"])
          }
        >
          <option value="all">All sources</option>
          <option value="fmcsa">FMCSA</option>
          <option value="google_places">Google Places</option>
          <option value="hauler_registry">Hauler registry</option>
          <option value="manual">Manual</option>
        </Select>

        <Select
          value={filters.state}
          onChange={(e) =>
            set("state", e.target.value as LeadFilters["state"])
          }
        >
          <option value="all">All states</option>
          {US_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Select
            value={filters.sortBy}
            onChange={(e) =>
              set("sortBy", e.target.value as LeadFilters["sortBy"])
            }
          >
            <option value="score">Sort: Score</option>
            <option value="fleetSize">Sort: Fleet size</option>
            <option value="name">Sort: Name</option>
            <option value="updatedAt">Sort: Recently updated</option>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            title="Toggle sort direction"
            onClick={() =>
              set("sortDir", filters.sortDir === "asc" ? "desc" : "asc")
            }
          >
            {filters.sortDir === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="font-mono text-[11px] uppercase tracking-wide text-muted">
          Fleet size {filters.minFleetSize}–
          {filters.maxFleetSize === 30 ? "30+" : filters.maxFleetSize}
        </label>
        <input
          type="range"
          min={0}
          max={30}
          value={filters.minFleetSize}
          onChange={(e) =>
            set(
              "minFleetSize",
              Math.min(Number(e.target.value), filters.maxFleetSize),
            )
          }
          className="w-32 accent-amber"
        />
        <input
          type="range"
          min={0}
          max={30}
          value={filters.maxFleetSize}
          onChange={(e) =>
            set(
              "maxFleetSize",
              Math.max(Number(e.target.value), filters.minFleetSize),
            )
          }
          className="w-32 accent-amber"
        />

        <span className="ml-auto font-mono text-[11px] text-muted">
          {resultCount} results
        </span>
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            Clear filters
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={csvLoading || filteredLeads.length === 0}
          >
            {csvLoading ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={excelLoading || filteredLeads.length === 0}
          >
            {excelLoading ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      </div>
    </div>
  );
}