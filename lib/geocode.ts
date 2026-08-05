export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/** Geocodes a free-text address. Returns null on no match or missing key —
 *  callers should treat that as "needs manual review", not a hard failure. */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_STATIC_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !address.trim()) return null;

  const params = new URLSearchParams({ address, key });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const result = data?.results?.[0];
  if (!result) return null;

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}