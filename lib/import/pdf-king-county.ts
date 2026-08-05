import type { ParsedRow, RawCategory } from "../types";
import { WA_CITIES } from "./wa-cities";

/** Finds the city as the longest (up to 3-word) trailing match against a known
 *  city list — more reliable than a generic regex, since street-type words
 *  (ST, SW, AVE, Central, Highland...) are indistinguishable from city names
 *  by pattern alone. Returns the remaining text (company name + address). */
function extractCity(text: string): { city?: string; rest: string } {
  const words = text.trim().split(/\s+/);
  for (let n = Math.min(3, words.length); n >= 1; n--) {
    const candidate = words.slice(-n).join(" ");
    if (WA_CITIES.has(candidate.toLowerCase())) {
      return { city: candidate, rest: words.slice(0, -n).join(" ") };
    }
  }
  return { city: undefined, rest: text };
}

// x-position bands (points) for the 5 category "yes" columns, derived by
// clustering every "yes" token's x-position across the actual King County
// PDF template. Tolerance of ±14pt absorbs minor font/rendering drift.
const CATEGORY_BANDS: { center: number; category: RawCategory }[] = [
  { center: 596, category: "oss" },
  { center: 626, category: "grease_trap" },
  { center: 649, category: "portable_toilet" },
  { center: 673, category: "vessel_holding_tank" },
  { center: 697, category: "other" },
];

function bandFor(x: number): RawCategory | null {
  let best: { d: number; category: RawCategory } | null = null;
  for (const b of CATEGORY_BANDS) {
    const d = Math.abs(x - b.center);
    if (d <= 14 && (!best || d < best.d)) best = { d, category: b.category };
  }
  return best?.category ?? null;
}

interface LineItem { str: string; x: number; y: number }

export async function parseHaulerPdf(buffer: Buffer): Promise<ParsedRow[]> {
  // legacy build works in Node without DOM/canvas dependencies
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const lines: LineItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: LineItem[] = content.items
      .map((it: any) => ({ str: it.str, x: it.transform[4], y: Math.round(it.transform[5]) }))
      .filter((it: LineItem) => it.str.trim());

    const byY: { y: number; items: LineItem[] }[] = [];
    for (const it of items) {
      let line = byY.find((l) => Math.abs(l.y - it.y) <= 2);
      if (!line) { line = { y: it.y, items: [] }; byY.push(line); }
      line.items.push(it);
    }
    byY.sort((a, b) => b.y - a.y);
    for (const line of byY) {
      line.items.sort((a, b) => a.x - b.x);
      lines.push(line.items);
    }
  }

  const rows: ParsedRow[] = [];
  let rowIndex = 0;

  for (const items of lines) {
    const regMatch = items[0]?.str.match(/^KC[\w-]+$/i);
    if (!regMatch) continue; // skip headers/titles — data rows all start with a KC reg number

    // category flags: any "yes" item positioned in one of the known x-bands
    const categories: RawCategory[] = [];
    const nonFlagItems: LineItem[] = [];
    for (const it of items) {
      const cat = it.str.trim().toLowerCase() === "yes" ? bandFor(it.x) : null;
      if (cat) categories.push(cat);
      else nonFlagItems.push(it);
    }

    const regNumber = nonFlagItems[0].str;
    const remainder = nonFlagItems.slice(1).map((i) => i.str).join(" ");

    const phoneMatch = remainder.match(/\(\d{3}\)\s?\d{3}-\d{4}/);
    const phone = phoneMatch?.[0];
    const beforePhone = phoneMatch ? remainder.slice(0, phoneMatch.index) : remainder;

    // zip is always the rightmost standalone 5-digit number before the phone
    // (street numbers earlier in the string can also be 5 digits, so take the last match)
    const zipMatches = [...beforePhone.matchAll(/\b\d{5}\b/g)];
    const zipHit = zipMatches[zipMatches.length - 1];
    const zip = zipHit?.[0];
    const beforeZip = zipHit ? beforePhone.slice(0, zipHit.index).trim() : beforePhone.trim();

    const { city, rest: companyAndAddress } = extractCity(beforeZip);

    // split "Company Name  123 Some St" at the first token that looks like the
    // start of a street address (a number, or "P.O. BOX ...")
    const addrStartMatch = companyAndAddress.match(/\b(?:P\.?O\.?\s*BOX\s*\d+|POBOX\s*\d+|\d{1,6}[A-Za-z]?\s+\S)/i);
    let companyName = companyAndAddress;
    let address = "";
    if (addrStartMatch && addrStartMatch.index !== undefined && addrStartMatch.index > 0) {
      companyName = companyAndAddress.slice(0, addrStartMatch.index).trim();
      address = companyAndAddress.slice(addrStartMatch.index).trim();
    }

    const warnings: string[] = [];
    if (!address) warnings.push("Could not isolate a street address — review manually");
    if (!phone) warnings.push("No phone number matched");
    if (!zip) warnings.push("No zip matched");
    if (!city) warnings.push("No known city matched — check WA_CITIES list");

    rows.push({
      rowIndex: rowIndex++,
      companyName: companyName || "Unknown",
      address,
      city,
      zip,
      phone,
      categories,
      regNumber,
      include: true,
      warning: warnings.length ? warnings.join("; ") : undefined,
    });
  }

  return rows;
}