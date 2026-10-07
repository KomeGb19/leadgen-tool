"use client";

import useSWR from "swr";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { scoreTier } from "@/lib/scoring";
import { fleetSize } from "@/lib/filters";
import type { Lead } from "@/lib/types";
import {useEffect} from "react"
import "leaflet/dist/leaflet.css";
import { authFetch } from "@/lib/auth";

const tierColor = { hot: "#E8A33D", warm: "#4A90D9", cold: "#8A9199" } as const;

// Center of continental USA for better initial view of the entire country
const MAP_CENTER: [number, number] = [39.8283, -98.5795];

// Imported leads can have null lat/lng if geocoding failed or hasn't run yet —
// Leaflet throws hard on a null coordinate instead of skipping it, so filter
// those out before they ever reach a marker or fitBounds.
function hasCoords(
  lead: Lead,
): lead is Lead & { company: Lead["company"] & { lat: number; lng: number } } {
  return (
    typeof lead.company.lat === "number" &&
    typeof lead.company.lng === "number" &&
    !Number.isNaN(lead.company.lat) &&
    !Number.isNaN(lead.company.lng)
  );
}

function FitBounds({ leads }: { leads: Lead[] }) {
  const map = useMap();
  useEffect(() => {
    const plottable = leads.filter(hasCoords);
    if (plottable.length === 0) return;
    const bounds = plottable.map(
      (l) => [l.company.lat, l.company.lng] as [number, number],
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [leads, map]);
  return null;
}

// Fetcher function for SWR that includes auth
const fetcher = (url: string) => authFetch(url).then(async (res) => res.json());

export default function LeadMap({ onSelect }: { onSelect: (lead: Lead) => void }) {
  const { data: leads, error, isLoading } = useSWR<{ leads: Lead[]; source: string }>(
    "/api/leads",
    fetcher
  );

  if (error) return <div>Failed to load leads</div>;
  if (isLoading) return <div>Loading leads...</div>;

  const leadsData = leads?.leads ?? [];

  const plottable = leadsData.filter(hasCoords);
  const missingCount = leadsData.length - plottable.length;

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={3}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#14171B" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY ?? ""}`}
      />
      {plottable.map((lead) => {
        const tier = scoreTier(lead.score);
        return (
          <CircleMarker
            key={lead.id}
            center={[lead.company.lat, lead.company.lng]}
            radius={6 + Math.min(fleetSize(lead), 20) / 4}
            pathOptions={{
              color: tierColor[tier],
              fillColor: tierColor[tier],
              fillOpacity: 0.55,
              weight: 1.5,
            }}
            eventHandlers={{ click: () => onSelect(lead) }}
          >
            <Popup>
              <div className="font-sans text-xs">
                <div className="font-semibold">{lead.company.name}</div>
                <div>
                  {fleetSize(lead)} trucks · score {lead.score}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
      <FitBounds leads={leadsData} />
      {missingCount > 0 && (
        <div className="leaflet-bottom leaflet-left pointer-events-none m-2 rounded bg-ink/80 px-2 py-1 font-mono text-[10px] text-muted">
          {missingCount} lead{missingCount === 1 ? "" : "s"} missing coordinates
          — not shown on map
        </div>
      )}
    </MapContainer>
  );
}
