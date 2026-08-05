export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  placeId: string;
  rating?: number;
  userRatingCount?: number;
}

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  return key;
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri,places.id,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: query }),
  });
  if (!res.ok) throw new Error(`Places search failed: ${res.status}`);
  const data = await res.json();
  return (data.places ?? []).map((p: any) => ({
    name: p.displayName?.text ?? "Unknown",
    address: p.formattedAddress ?? "",
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    phone: p.nationalPhoneNumber,
    website: p.websiteUri,
    placeId: p.id,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
  }));
}

/** Static satellite image URL for a lat/lng — cheap, cacheable, good enough
 *  for a lead card thumbnail. Zoom 19-20 resolves individual trucks in a lot. */
export function staticSatelliteUrl(lat: number, lng: number, zoom = 19, size = "640x400"): string {
  const key = process.env.GOOGLE_MAPS_STATIC_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? "";
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size,
    maptype: "satellite",
    scale: "2",
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
