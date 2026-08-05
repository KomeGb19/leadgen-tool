const BASE = "https://mobile.fmcsa.dot.gov/qc/services/carriers";

export interface FmcsaCarrierRaw {
  dotNumber: string;
  legalName: string;
  dbaName?: string;
  phyStreet?: string;
  phyCity?: string;
  phyState?: string;
  phyZipcode?: string;
  totalPowerUnits?: number;
  totalDrivers?: number;
  statusCode?: string;
  mcs150Date?: string;
}

function webKey(): string {
  const key = process.env.FMCSA_WEBKEY;
  if (!key) throw new Error("FMCSA_WEBKEY is not set — get one at mobile.fmcsa.dot.gov (free, via Login.gov)");
  return key;
}

/** Keyword search by company name. Returns partial matches — always
 *  reconcile against address/phone before trusting a match. */
export async function searchCarrierByName(name: string): Promise<FmcsaCarrierRaw[]> {
  const url = `${BASE}/name/${encodeURIComponent(name)}?webKey=${webKey()}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`FMCSA name search failed: ${res.status}`);
  const data = await res.json();
  return data?.content?.map((c: { carrier: FmcsaCarrierRaw }) => c.carrier) ?? [];
}

/** Exact lookup by USDOT number. */
export async function getCarrierByDot(dot: string): Promise<FmcsaCarrierRaw | null> {
  const url = `${BASE}/${dot}?webKey=${webKey()}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.content?.carrier ?? null;
}

/** Naive best-match picker: prefers a name+city match, falls back to first result. */
export function pickBestMatch(
  candidates: FmcsaCarrierRaw[],
  targetCity: string
): FmcsaCarrierRaw | undefined {
  const cityMatch = candidates.find(
    (c) => c.phyCity?.toLowerCase() === targetCity.toLowerCase()
  );
  return cityMatch ?? candidates[0];
}
