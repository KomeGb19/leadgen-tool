import Papa from "papaparse";
import type { ParsedRow, RawCategory } from "@/lib/types";

const HEADER_ALIASES: Record<string, string[]> = {
  companyName: ["company", "company name", "business name", "name", "dba"],
  address: ["address", "mailing address", "street address", "street"],
  city: ["city", "city (mailing)", "mailing city"],
  state: ["state", "st", "state (mailing)"],
  zip: ["zip", "zip code", "zipcode", "postal code", "zip (mailing)"],
  phone: ["phone", "phone number", "telephone", "contact phone"],
  categories: ["categories", "category", "services", "type"],
  regNumber: ["registration", "registration number", "reg #", "license #", "permit #"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function findColumn(headers: string[], field: keyof typeof HEADER_ALIASES): string | undefined {
  const aliases = HEADER_ALIASES[field];
  return headers.find((h) => aliases.includes(normalizeHeader(h)));
}

function parseCategories(raw: string | undefined): RawCategory[] {
  if (!raw) return [];
  const text = raw.toLowerCase();
  const cats: RawCategory[] = [];
  if (/\bseptic\b|\boss\b|on-?site sewage/.test(text)) cats.push("oss");
  if (/grease/.test(text)) cats.push("grease_trap");
  if (/portable toilet|porta-?john/.test(text)) cats.push("portable_toilet");
  if (/vessel|holding tank/.test(text)) cats.push("vessel_holding_tank");
  return cats;
}

export function parseHaulerCsv(fileText: string): ParsedRow[] {
  const { data } = Papa.parse<Record<string, string>>(fileText, {
    header: true,
    skipEmptyLines: true,
  });

  if (!data.length) return [];
  const headers = Object.keys(data[0]);

  const companyCol = findColumn(headers, "companyName");
  const addressCol = findColumn(headers, "address");
  const cityCol = findColumn(headers, "city");
  const stateCol = findColumn(headers, "state");
  const zipCol = findColumn(headers, "zip");
  const phoneCol = findColumn(headers, "phone");
  const categoriesCol = findColumn(headers, "categories");
  const regCol = findColumn(headers, "regNumber");

  return data.map((row, i) => {
    const companyName = companyCol ? row[companyCol]?.trim() : "";
    const address = addressCol ? row[addressCol]?.trim() : "";
    const warnings: string[] = [];
    if (!companyName) warnings.push("Missing company name — check the CSV header mapping");
    if (!address) warnings.push("Missing address");

    return {
      rowIndex: i,
      companyName: companyName || "Unknown",
      address: address || "",
      city: cityCol ? row[cityCol]?.trim() : undefined,
      state: stateCol ? row[stateCol]?.trim() : undefined,
      zip: zipCol ? row[zipCol]?.trim() : undefined,
      phone: phoneCol ? row[phoneCol]?.trim() : undefined,
      categories: categoriesCol ? parseCategories(row[categoriesCol]) : [],
      regNumber: regCol ? row[regCol]?.trim() : undefined,
      include: true,
      warning: warnings.length ? warnings.join("; ") : undefined,
    };
  });
}