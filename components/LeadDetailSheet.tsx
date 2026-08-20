"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScoreRing } from "@/components/ScoreRing";
import { SatelliteViewer } from "@/components/SatelliteViewer";
import { fleetSize } from "@/lib/filters";
import { formatDate, formatRelative } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types";

export function LeadDetailSheet({
  lead,
  open,
  onClose,
  onStatusChange,
  onAddNote,
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onAddNote: (leadId: string, body: string) => void;
}) {
  const [note, setNote] = useState("");

  if (!lead) return null;
  const { company, fmcsa, imagery } = lead;

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sticky top-0 z-40 border-b border-line bg-panel/95 px-6 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
              {company.category.replace("_", " ")} · {company.city},{" "}
              {company.state}
            </div>
            <h2 className="font-display text-2xl uppercase text-paper">
              {company.name}
            </h2>
            <p className="mt-0.5 text-sm text-muted">{company.address}</p>
          </div>
          <ScoreRing score={lead.score} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Select
            value={lead.status}
            onChange={(e) =>
              onStatusChange(lead.id, e.target.value as LeadStatus)
            }
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </Select>
          {company.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`tel:${company.phone}`)}
            >
              Call {company.phone}
            </Button>
          )}
          {company.website && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`${company.website}`, "_blank")}
            >
              Visit site ↗
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fmcsa">FMCSA</TabsTrigger>
            <TabsTrigger value="imagery">Satellite</TabsTrigger>
            <TabsTrigger value="notes">Notes ({lead.notes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Fleet size" value={`${fleetSize(lead)} trucks`} />
              <InfoRow
                label="Data confidence"
                value={fmcsa ? "Verified (FMCSA)" : "Estimated (imagery)"}
              />
              <InfoRow
                label="Years in business"
                value={
                  company.yearsInBusiness
                    ? `${company.yearsInBusiness} yrs`
                    : "Unknown"
                }
              />
              <InfoRow
                label="Reviews"
                value={
                  company.reviewCount
                    ? `${company.reviewCount} (${company.rating?.toFixed(1)}★)`
                    : "None found"
                }
              />
              <InfoRow
                label="Lead source"
                value={company.source.replace("_", " ")}
              />
              <InfoRow
                label="Last updated"
                value={formatRelative(lead.updatedAt)}
              />
            </div>
            <Separator className="my-4" />
            <div className="text-xs text-muted">
              Score weighs verified FMCSA fleet size highest, falls back to the
              satellite truck count estimate when no DOT record exists, and adds
              a small boost for review volume and business longevity.
            </div>
          </TabsContent>

          <TabsContent value="fmcsa">
            {fmcsa ? (
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="USDOT #" value={fmcsa.usdotNumber} mono />
                {fmcsa.mcNumber && (
                  <InfoRow label="MC #" value={fmcsa.mcNumber} mono />
                )}
                <InfoRow
                  label="Power units"
                  value={String(fmcsa.powerUnits ?? "—")}
                />
                <InfoRow label="Drivers" value={String(fmcsa.drivers ?? "—")} />
                <InfoRow
                  label="Operating status"
                  value={fmcsa.operatingStatus ?? "—"}
                  badge={fmcsa.operatingStatus === "AUTHORIZED" ? "ok" : "warn"}
                />
                {fmcsa.mcs150Date && (
                  <InfoRow
                    label="MCS-150 filed"
                    value={formatDate(fmcsa.mcs150Date)}
                  />
                )}
              </div>
            ) : (
              <div className="rounded border border-dashed border-line py-8 text-center">
                <p className="text-sm text-paper">No FMCSA record matched</p>
                <p className="mt-1 text-xs text-muted">
                  Company may be too small to require USDOT registration, or the
                  name match needs manual review. Fleet size below is
                  estimate-only.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="imagery">
            <SatelliteViewer company={company} imagery={imagery} />
          </TabsContent>

          <TabsContent value="notes">
            <div className="flex flex-col gap-3">
              {lead.notes.length === 0 && (
                <p className="py-4 text-center text-xs text-muted">
                  No notes yet — log a call or site visit below.
                </p>
              )}
              {lead.notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded border border-line bg-ink p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <Badge variant="outline">{n.author}</Badge>
                    <span className="font-mono text-[10px] text-muted">
                      {formatRelative(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-paper">{n.body}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Log a call, site visit, or qualification note..."
                  className="h-20 flex-1 rounded border border-line bg-ink p-2 text-sm text-paper placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60"
                />
              </div>
              <Button
                variant="amber"
                size="sm"
                className="self-end"
                disabled={!note.trim()}
                onClick={() => {
                  onAddNote(lead.id, note.trim());
                  setNote("");
                }}
              >
                Add note
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Sheet>
  );
}

function InfoRow({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: "ok" | "warn";
}) {
  return (
    <div className="rounded border border-line bg-ink p-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted">
        {label}
      </div>
      {badge ? (
        <Badge variant={badge} className="mt-1">
          {value}
        </Badge>
      ) : (
        <div className={`mt-0.5 text-sm text-paper ${mono ? "font-mono" : ""}`}>
          {value}
        </div>
      )}
    </div>
  );
}
