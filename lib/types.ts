export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";
export type LeadSource = "fmcsa" | "google_places" | "manual" | "hauler_registry";

export interface FmcsaRecord {
  usdotNumber: string;
  mcNumber?: string;
  powerUnits?: number;
  drivers?: number;
  operatingStatus?: string;
  cargoTypes?: string[];
  mcs150Date?: string;
}

export interface Imagery {
  imageUrl: string;
  capturedDate?: string;
  source: "google_static" | "skyfi" | "manual";
  truckCountEstimate?: number;
}

export interface Company {
  id: string;
  name: string;
  dba?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  source: LeadSource;
  category: "septic" | "grease_trap" | "both";
  yearsInBusiness?: number;
  reviewCount?: number;
  rating?: number;
}

export interface Lead {
  id: string;
  company: Company;
  fmcsa?: FmcsaRecord;
  imagery?: Imagery;
  score: number;
  status: LeadStatus;
  notes: Note[];
  updatedAt: string;
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
  author: string;
}

export interface LeadFilters {
  query: string;
  minFleetSize: number;
  maxFleetSize: number;
  category: "all" | "septic" | "grease_trap" | "both";
  status: "all" | LeadStatus;
  source: "all" | LeadSource;
  state: "all" | string;
  sortBy: "score" | "fleetSize" | "name" | "updatedAt";
  sortDir: "asc" | "desc";
}

export type RawCategory =
  | "oss" | "septic" | "grease_trap" | "portable_toilet" | "vessel_holding_tank" | "other";

export interface ParsedRow {
  rowIndex: number;
  companyName: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  categories: RawCategory[];
  regNumber?: string;
  include: boolean;   // user can uncheck bad rows in the preview before import
  warning?: string;   // e.g. "couldn't isolate address from company name"
}

export interface ParseResult {
  rows: ParsedRow[];
  sourceLabel: string;
  fileType: "pdf" | "csv";
}

/** Collapses the registry's fine-grained categories into the app's 3-way enum. */
export function toAppCategory(cats: RawCategory[]): "septic" | "grease_trap" | "both" {
  const hasSeptic = cats.includes("oss") || cats.includes("septic");
  const hasGrease = cats.includes("grease_trap");
  if (hasSeptic && hasGrease) return "both";
  if (hasGrease) return "grease_trap";
  return "septic"; // default bucket for septic-adjacent (portable toilet, vessel, other)
}
