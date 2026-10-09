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

/**
 * Check if FMCSA webkey is configured and appears valid.
 * Returns true if webkey is present and has basic validity characteristics.
 */
function hasValidWebKeyConfig(): boolean {
  const key = process.env.FMCSA_WEBKEY;
  if (!key || key.trim() === '') {
    return false;
  }
  // Basic validation: FMCSA webkeys are typically hex strings
  // This is not foolproof but can catch obviously misconfigured keys
  const trimmed = key.trim();
  return trimmed.length > 0 && /^[a-f0-9]+$/i.test(trimmed);
}

function webKey(): string {
  const key = process.env.FMCSA_WEBKEY;
  if (!key) throw new Error("FMCSA_WEBKEY is not set — get one at mobile.fmcsa.dot.gov (free, via Login.gov)");
  return key;
}

/** Keyword search by company name. Returns partial matches — always
 *  reconcile against address/phone before trusting a match. */
export async function searchCarrierByName(name: string): Promise<FmcsaCarrierRaw[]> {
  if (!name || name.trim() === '') {
    return [];
  }

  // Check if webkey is configured
  if (!hasValidWebKeyConfig()) {
    console.warn('[fmcsa] FMCSA webkey not configured or invalid - skipping FMCSA lookup');
    return [];
  }

  const url = `${BASE}/name/${encodeURIComponent(name.trim())}?webKey=${webKey()}`;

  // Retry logic for transient failures
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (!res.ok) {
        // Don't retry on 4xx errors (client errors) as they won't change with retries
        if (res.status >= 400 && res.status < 500) {
          // Log the specific error for debugging but don't throw for client errors
          console.warn(`[fmcsa] FMCSA name search failed with status ${res.status} for "${name.trim()}"`);
          return [];
        }
        lastError = new Error(`FMCSA name search failed: ${res.status}`);
        // Wait before retrying (exponential backoff)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
        continue;
      }
      const data = await res.json();
      return data?.content?.map((c: { carrier: FmcsaCarrierRaw }) => c.carrier) ?? [];
    } catch (err) {
      lastError = err as Error;
      // For network errors, retry; for other errors, we might want to retry depending on the error
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // If all retries failed, log and return empty array rather than throwing
  // This ensures the enrichment process continues even if FMCSA is unavailable
  console.warn(`[fmcsa] FMCSA name search failed after retries for "${name.trim()}"`, lastError);
  return [];
}

/** Exact lookup by USDOT number. */
export async function getCarrierByDot(dot: string): Promise<FmcsaCarrierRaw | null> {
  if (!dot || dot.trim() === '') {
    return null;
  }

  // Check if webkey is configured
  if (!hasValidWebKeyConfig()) {
    console.warn('[fmcsa] FMCSA webkey not configured or invalid - skipping FMCSA lookup');
    return null;
  }

  const url = `${BASE}/${dot.trim()}?webKey=${webKey()}`;

  // Retry logic for transient failures
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (!res.ok) {
        // Don't retry on 4xx errors (client errors) as they won't change with retries
        if (res.status >= 400 && res.status < 500) {
          return null;
        }
        lastError = new Error(`FMCSA dot lookup failed: ${res.status}`);
        // Wait before retrying (exponential backoff)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
        continue;
      }
      const data = await res.json();
      return data?.content?.carrier ?? null;
    } catch (err) {
      lastError = err as Error;
      // For network errors, retry; for other errors, we might want to retry depending on the error
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // If all retries failed, return null (consistent with original behavior)
  return null;
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
