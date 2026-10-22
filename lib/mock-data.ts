import type { Lead } from "./types";
import { scoreLead } from "./scoring";

// Placeholder satellite-style thumbnail used in demo mode (no Google Maps key
// configured yet). Swap for real staticSatelliteUrl() output once live.
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#2B3229"/><g fill="#4A5240"><rect x="40" y="60" width="560" height="280" rx="4"/></g><g fill="#8A9199" font-family="monospace" font-size="14"><text x="50" y="380">Sample lot view — connect Google Maps key for live imagery</text></g></svg>`
  );

// Fictional, illustrative dataset — shaped like real FMCSA + Places output so the
// UI is fully wired end-to-end before real API keys are added. Swap for live
// data by running the /api/enrich pipeline once Supabase + API keys are set.
const RAW = [
  {
    name: "Cascade Septic & Grease Services",
    address: "4210 Airport Way S, Seattle, WA 98108",
    lat: 47.5636, lng: -122.3208,
    phone: "(206) 555-0142", website: "cascadeseptic.example.com",
    category: "both" as const, source: "fmcsa" as const,
    yearsInBusiness: 18, reviewCount: 214, rating: 4.6,
    ownershipStatus: "pe_backed" as const,
    parentCompany: "Summit Capital Partners",
    acquisitionYear: 2021,
    ownershipConfidence: "high" as const,
    ownershipSources: ["https://example.com/cascade-ownership"],
    fmcsa: { usdotNumber: "1893442", powerUnits: 14, drivers: 16, operatingStatus: "AUTHORIZED", mcs150Date: "2026-02-11" },
    imagery: { truckCountEstimate: 13, capturedDate: "2026-04-02", source: "google_static" as const },
  },
  {
    name: "Emerald City Pumping Co",
    address: "8815 Aurora Ave N, Seattle, WA 98103",
    lat: 47.6926, lng: -122.3452,
    phone: "(206) 555-0187", website: "emeraldpumping.example.com",
    category: "septic" as const, source: "fmcsa" as const,
    yearsInBusiness: 9, reviewCount: 88, rating: 4.4,
    fmcsa: { usdotNumber: "2657710", powerUnits: 6, drivers: 7, operatingStatus: "AUTHORIZED", mcs150Date: "2025-11-30" },
    imagery: { truckCountEstimate: 5, capturedDate: "2026-03-18", source: "google_static" as const },
  },
  {
    name: "Puget Sound Grease Trap Solutions",
    address: "2100 S Massachusetts St, Seattle, WA 98144",
    lat: 47.5822, lng: -122.3011,
    phone: "(206) 555-0223", website: "pugetgreasetrap.example.com",
    category: "grease_trap" as const, source: "google_places" as const,
    yearsInBusiness: 6, reviewCount: 41, rating: 4.1,
    fmcsa: undefined,
    imagery: { truckCountEstimate: 3, capturedDate: "2026-01-27", source: "google_static" as const },
  },
  {
    name: "Duwamish Valley Septic Service",
    address: "7301 W Marginal Way S, Seattle, WA 98108",
    lat: 47.5451, lng: -122.3474,
    phone: "(206) 555-0309", website: "duwamishseptic.example.com",
    category: "septic" as const, source: "hauler_registry" as const,
    yearsInBusiness: 27, reviewCount: 156, rating: 4.7,
    fmcsa: { usdotNumber: "1042883", powerUnits: 22, drivers: 25, operatingStatus: "AUTHORIZED", mcs150Date: "2026-05-04" },
    imagery: { truckCountEstimate: 20, capturedDate: "2026-04-29", source: "google_static" as const },
  },
  {
    name: "Rainier Grease & Sewer",
    address: "5610 Rainier Ave S, Seattle, WA 98118",
    lat: 47.5546, lng: -122.2734,
    phone: "(206) 555-0466", website: "rainiergrease.example.com",
    category: "both" as const, source: "google_places" as const,
    yearsInBusiness: 4, reviewCount: 19, rating: 3.9,
    fmcsa: undefined,
    imagery: { truckCountEstimate: 2, capturedDate: "2026-02-14", source: "google_static" as const },
  },
  {
    name: "Sound Environmental Haulers",
    address: "9600 8th Ave S, Seattle, WA 98108",
    lat: 47.5288, lng: -122.3253,
    phone: "(206) 555-0510", website: "soundenvhaulers.example.com",
    category: "grease_trap" as const, source: "fmcsa" as const,
    yearsInBusiness: 12, reviewCount: 67, rating: 4.3,
    fmcsa: { usdotNumber: "3011256", powerUnits: 9, drivers: 10, operatingStatus: "AUTHORIZED", mcs150Date: "2025-09-19" },
    imagery: { truckCountEstimate: 8, capturedDate: "2026-03-30", source: "google_static" as const },
  },
  {
    name: "Ballard Bay Septic",
    address: "5400 Shilshole Ave NW, Seattle, WA 98107",
    lat: 47.6685, lng: -122.3898,
    phone: "(206) 555-0621", website: "ballardbayseptic.example.com",
    category: "septic" as const, source: "google_places" as const,
    yearsInBusiness: 3, reviewCount: 12, rating: 4.0,
    fmcsa: undefined,
    imagery: { truckCountEstimate: 1, capturedDate: "2026-01-09", source: "google_static" as const },
  },
  {
    name: "Northgate Grease Recovery",
    address: "11030 5th Ave NE, Seattle, WA 98125",
    lat: 47.7089, lng: -122.3204,
    phone: "(206) 555-0734", website: "northgategrease.example.com",
    category: "grease_trap" as const, source: "fmcsa" as const,
    yearsInBusiness: 15, reviewCount: 103, rating: 4.5,
    fmcsa: { usdotNumber: "2249981", powerUnits: 11, drivers: 12, operatingStatus: "AUTHORIZED", mcs150Date: "2026-01-22" },
    imagery: { truckCountEstimate: 10, capturedDate: "2026-04-11", source: "google_static" as const },
  },
  {
    name: "South Park Septic & Portable Services",
    address: "8000 14th Ave S, Seattle, WA 98108",
    lat: 47.5301, lng: -122.3167,
    phone: "(206) 555-0845", website: "southparkseptic.example.com",
    category: "both" as const, source: "hauler_registry" as const,
    yearsInBusiness: 21, reviewCount: 178, rating: 4.4,
    fmcsa: { usdotNumber: "1567744", powerUnits: 17, drivers: 19, operatingStatus: "AUTHORIZED", mcs150Date: "2026-03-08" },
    imagery: { truckCountEstimate: 16, capturedDate: "2026-04-22", source: "google_static" as const },
  },
  {
    name: "Georgetown Grease Trap Pros",
    address: "6355 Corson Ave S, Seattle, WA 98108",
    lat: 47.5462, lng: -122.3282,
    phone: "(206) 555-0912", website: "georgetowngrease.example.com",
    category: "grease_trap" as const, source: "google_places" as const,
    yearsInBusiness: 7, reviewCount: 54, rating: 4.2,
    fmcsa: { usdotNumber: "2893340", powerUnits: 4, drivers: 4, operatingStatus: "AUTHORIZED", mcs150Date: "2025-12-01" },
    imagery: { truckCountEstimate: 4, capturedDate: "2026-02-27", source: "google_static" as const },
  },
  {
    name: "Highline Septic Systems",
    address: "14th Ave S & S 128th St, Tukwila, WA 98168",
    lat: 47.4826, lng: -122.2895,
    phone: "(206) 555-1023", website: "highlineseptic.example.com",
    category: "septic" as const, source: "fmcsa" as const,
    yearsInBusiness: 10, reviewCount: 72, rating: 4.3,
    fmcsa: { usdotNumber: "2410967", powerUnits: 7, drivers: 8, operatingStatus: "AUTHORIZED", mcs150Date: "2025-10-15" },
    imagery: { truckCountEstimate: 6, capturedDate: "2026-03-05", source: "google_static" as const },
  },
  {
    name: "Lake City Waste & Grease",
    address: "12555 Lake City Way NE, Seattle, WA 98125",
    lat: 47.7192, lng: -122.3005,
    phone: "(206) 555-1134", website: "lakecitywaste.example.com",
    category: "grease_trap" as const, source: "google_places" as const,
    yearsInBusiness: 2, reviewCount: 6, rating: 3.7,
    fmcsa: undefined,
    imagery: { truckCountEstimate: 1, capturedDate: "2025-12-19", source: "google_static" as const },
  },
  {
    name: "Interbay Septic & Sewer",
    address: "1727 15th Ave W, Seattle, WA 98119",
    lat: 47.6414, lng: -122.3798,
    phone: "(206) 555-1245", website: "interbayseptic.example.com",
    category: "both" as const, source: "hauler_registry" as const,
    yearsInBusiness: 33, reviewCount: 261, rating: 4.8,
    fmcsa: { usdotNumber: "0894471", powerUnits: 28, drivers: 31, operatingStatus: "AUTHORIZED", mcs150Date: "2026-05-19" },
    imagery: { truckCountEstimate: 25, capturedDate: "2026-05-01", source: "google_static" as const },
  },
  {
    name: "Delridge Drain & Grease",
    address: "6070 Delridge Way SW, Seattle, WA 98106",
    lat: 47.5423, lng: -122.3628,
    phone: "(206) 555-1356", website: "delridgedrain.example.com",
    category: "grease_trap" as const, source: "google_places" as const,
    yearsInBusiness: 5, reviewCount: 27, rating: 4.0,
    fmcsa: undefined,
    imagery: { truckCountEstimate: 2, capturedDate: "2026-01-31", source: "google_static" as const },
  },
];

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const mockLeads: Lead[] = RAW.map((r, i) => {
  const company = {
    id: slug(r.name),
    name: r.name,
    address: r.address,
    city: r.address.includes("Tukwila") ? "Tukwila" : "Seattle",
    state: "WA",
    lat: r.lat,
    lng: r.lng,
    phone: r.phone,
    website: r.website,
    source: r.source,
    category: r.category,
    yearsInBusiness: r.yearsInBusiness,
    reviewCount: r.reviewCount,
    rating: r.rating,
    ownershipStatus: (r as any).ownershipStatus,
    parentCompany: (r as any).parentCompany,
    acquisitionYear: (r as any).acquisitionYear,
    ownershipConfidence: (r as any).ownershipConfidence,
    ownershipSources: (r as any).ownershipSources ?? [],
    ownershipResearchedAt: new Date().toISOString(),
  };

  const statusCycle = ["new", "new", "contacted", "new", "qualified", "new", "contacted", "won", "new", "new", "lost", "new", "qualified", "new"] as const;

  return {
    id: company.id,
    company,
    fmcsa: (r as any).fmcsa,
    imagery: { ...((r as any).imagery), imageUrl: PLACEHOLDER_IMAGE },
    score: scoreLead(company as any, (r as any).fmcsa, (r as any).imagery),
    status: statusCycle[i % statusCycle.length],
    notes: [],
    updatedAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  };
});