"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Company, Imagery } from "@/lib/types";

/** Client-safe version of the static map URL builder. Must use the
 *  NEXT_PUBLIC_-prefixed key — server-only env vars (like
 *  GOOGLE_MAPS_STATIC_API_KEY, used in lib/places.ts) are always undefined
 *  in browser code, even if they're set in .env.local. */
function clientSatelliteUrl(lat: number, lng: number, zoom: number): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: "640x400",
    maptype: "satellite",
    scale: "2",
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function SatelliteViewer({
  company,
  imagery,
  onEstimateChange,
}: {
  company: Company;
  imagery?: Imagery;
  onEstimateChange?: (count: number) => void;
}) {
  const [zoom, setZoom] = useState(19);
  const [editing, setEditing] = useState(false);
  const [estimate, setEstimate] = useState(imagery?.truckCountEstimate ?? 0);

  const hasKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY);
  const src = hasKey
    ? clientSatelliteUrl(company.lat, company.lng, zoom)
    : imagery?.imageUrl;

  return (
    <div className="overflow-hidden rounded border border-line bg-ink">
      <div className="relative aspect-video w-full bg-rail">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`Satellite view of ${company.name} lot`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
              No live imagery configured
            </span>
            <p className="text-xs text-muted">
              Set GOOGLE_MAPS_STATIC_API_KEY (server) and NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY (client)
              to render live satellite tiles here.
            </p>
          </div>
        )}

        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge variant={imagery?.source === "manual" ? "warn" : "outline"}>
            {imagery?.source === "skyfi" ? "High-res" : imagery?.source === "manual" ? "Manual" : "Google satellite"}
          </Badge>
          {imagery?.capturedDate && <Badge variant="outline">captured {imagery.capturedDate}</Badge>}
        </div>

        <div className="absolute bottom-2 right-2 flex gap-1">
          <Button size="icon" variant="ghost" className="bg-ink/70" onClick={() => setZoom((z) => Math.min(21, z + 1))}>
            +
          </Button>
          <Button size="icon" variant="ghost" className="bg-ink/70" onClick={() => setZoom((z) => Math.max(15, z - 1))}>
            −
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2.5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Truck count estimate
          </div>
          {editing ? (
            <input
              type="number"
              min={0}
              autoFocus
              value={estimate}
              onChange={(e) => setEstimate(Number(e.target.value))}
              onBlur={() => {
                setEditing(false);
                onEstimateChange?.(estimate);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setEditing(false);
                  onEstimateChange?.(estimate);
                }
              }}
              className="h-7 w-20 rounded border border-line bg-panel px-2 font-mono text-sm text-paper"
            />
          ) : (
            <span className="font-display text-2xl text-paper">{estimate}</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          {editing ? "Save" : "Correct count"}
        </Button>
      </div>
    </div>
  );
}