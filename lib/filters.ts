import type { Lead, LeadFilters } from "./types";

export function fleetSize(lead: Lead): number {
  return lead.fmcsa?.powerUnits ?? lead.imagery?.truckCountEstimate ?? 0;
}

export function applyFilters(leads: Lead[], f: LeadFilters): Lead[] {
  let result = leads.filter((l) => {
    const size = fleetSize(l);
    if (size < f.minFleetSize) return false;
    if (f.maxFleetSize < 30 && size > f.maxFleetSize) return false;
    if (f.category !== "all" && l.company.category !== f.category) return false;
    if (f.status !== "all" && l.status !== f.status) return false;
    if (f.source !== "all" && l.company.source !== f.source) return false;
    if (f.state !== "all" && l.company.state !== f.state) return false;
    if (f.query) {
      const q = f.query.toLowerCase();
      const haystack = `${l.company.name} ${l.company.address} ${l.fmcsa?.usdotNumber ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  result = [...result].sort((a, b) => {
    let cmp = 0;
    switch (f.sortBy) {
      case "score":
        cmp = a.score - b.score;
        break;
      case "fleetSize":
        cmp = fleetSize(a) - fleetSize(b);
        break;
      case "name":
        cmp = a.company.name.localeCompare(b.company.name);
        break;
      case "updatedAt":
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    return f.sortDir === "asc" ? cmp : -cmp;
  });

  return result;
}
