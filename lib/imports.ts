export type RawCategory =
  | "oss" | "septic" | "grease_trap" | "portable_toilet" | "vessel_holding_tank" | "other";

export interface ParsedRow {
  rowIndex: number;
  companyName: string;
  address: string;
  city?: string;
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