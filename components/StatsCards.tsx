import { Card, CardContent } from "@/components/ui/card";
import { fleetSize } from "@/lib/filters";
import { scoreTier } from "@/lib/scoring";
import type { Lead } from "@/lib/types";
import useSWR from "swr";
import { authFetch } from "@/lib/auth";

// Fetcher function for SWR that includes auth
const fetcher = (url: string) => authFetch(url).then(async (res) => res.json());

export function StatsCards() {
  const { data: leadsData, error, isLoading } = useSWR<{ leads: Lead[] }>(
    "/api/leads",
    fetcher
  );

  if (error) return <div>Failed to load stats</div>;
  if (isLoading) return <div>Loading stats...</div>;

  const leads = leadsData?.leads ?? [];
  const total = leads.length;
  const hot = leads.filter((l) => scoreTier(l.score) === "hot").length;
  const verified = leads.filter((l) => l.fmcsa).length;
  const totalTrucks = leads.reduce((sum, l) => sum + fleetSize(l), 0);
  const avgFleet = total ? (totalTrucks / total).toFixed(1) : "0";

  const stats = [
    { label: "Total leads", value: total },
    { label: "Hot leads", value: hot, accent: true },
    { label: "FMCSA verified", value: `${verified}/${total}` },
    { label: "Avg. fleet size", value: avgFleet },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="py-3.5">
            <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
              {s.label}
            </div>
            <div
              className={`font-display text-3xl ${s.accent ? "text-amber" : "text-paper"}`}
            >
              {s.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}