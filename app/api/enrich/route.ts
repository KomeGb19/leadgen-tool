import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { searchPlaces, staticSatelliteUrl } from "@/lib/places";
import { searchCarrierByName, pickBestMatch } from "@/lib/fmcsa";
import { scoreLead } from "@/lib/scoring";

/** Extract city name from query strings like "septic tank pumping Seattle WA" */
function extractCityFromQuery(query: string): string {
  // Query format: "[service] [city] [state]" or "[service] [city] WA"
  const parts = query.split(' ');
  // City is typically the second-to-last part (before state) or we can look for known city names
  // Simpler approach: assume format is consistent and city is at index 2 for our queries
  // "septic tank pumping Seattle WA" -> [0]septic [1]tank [2]pumping [3]Seattle [4]WA
  // Actually, let's be more robust and look for the part that's not a service word or state
  const serviceWords = ['septic', 'tank', 'pumping', 'grease', 'trap', 'cleaning'];
  const stateWords = ['WA', 'Washington'];

  for (const part of parts) {
    const lowerPart = part.toLowerCase();
    if (!serviceWords.includes(lowerPart) && !stateWords.includes(lowerPart) && !stateWords.includes(part)) {
      return part;
    }
  }

  // Fallback: return empty string if no city found (should not happen with our queries)
  return '';
}

const QUERIES = [
  "septic tank pumping Seattle WA",
  "septic tank pumping Spokane WA",
  "septic tank pumping Tacoma WA",
  "septic tank pumping Vancouver WA",
  "septic tank pumping Bellevue WA",
  "grease trap cleaning Seattle WA",
  "grease trap cleaning Spokane WA",
  "grease trap cleaning Tacoma WA",
  "grease trap cleaning Vancouver WA",
  "grease trap cleaning Bellevue WA"
];

export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase isn't configured yet — running in demo mode on mock data. Add env vars to run the live pipeline." },
        { status: 400 }
      );
    }
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY is not set" }, { status: 400 });
    }

    const supabase = supabaseServer();
    let inserted = 0;
    let matched = 0;

    for (const q of QUERIES) {
      const places = await searchPlaces(q);

      for (const place of places) {
        try {
          const category = q.includes("septic") ? "septic" : "grease_trap";

          const city = extractCityFromQuery(q);
          const { data: company } = await supabase
            .from("companies")
            .upsert(
              {
                name: place.name,
                address: place.address,
                ...(city ? { city } : {}),
                state: "WA",
                lat: place.lat,
                lng: place.lng,
                phone: place.phone,
                website: place.website,
                source: "google_places",
                category,
                review_count: place.userRatingCount,
                rating: place.rating,
              },
              { onConflict: "name,address" }
            )
            .select()
            .single();

          if (!company) continue;
          inserted++;

          let fmcsa;
          try {
            const candidates = await searchCarrierByName(place.name);
            const city = extractCityFromQuery(q);
            fmcsa = pickBestMatch(candidates, city);
          } catch {
            fmcsa = undefined; // FMCSA webkey missing or lookup failed — continue without it
          }

          if (fmcsa) {
            try {
              await supabase.from("fmcsa_records").upsert(
                {
                  company_id: company.id,
                  usdot_number: fmcsa.dotNumber,
                  power_units: fmcsa.totalPowerUnits,
                  drivers: fmcsa.totalDrivers,
                  operating_status: fmcsa.statusCode,
                  mcs150_date: fmcsa.mcs150Date,
                },
                { onConflict: "company_id" }
              );
              matched++;
            } catch (err) {
              console.error("[enrich] fmcsa upsert error:", err);
            }
          }

          try {
            await supabase.from("imagery").upsert(
              {
                company_id: company.id,
                image_url: staticSatelliteUrl(place.lat, place.lng),
                source: "google_static",
                captured_date: new Date().toISOString().slice(0, 10),
              },
              { onConflict: "company_id" }
            );
          } catch (err) {
            console.error("[enrich] imagery upsert error:", err);
          }

          try {
            await supabase
              .from("leads")
              .upsert(
                {
                  company_id: company.id,
                  score: scoreLead(
                    { reviewCount: place.userRatingCount, rating: place.rating },
                    fmcsa ? { powerUnits: fmcsa.totalPowerUnits, operatingStatus: fmcsa.statusCode } : undefined
                  ),
                },
                { onConflict: "company_id" }
              );
          } catch (err) {
            console.error("[enrich] leads upsert error:", err);
          }
        } catch (err) {
          console.error("[enrich] place processing error:", err);
          // continue to next place
        }
      }
    }

    return NextResponse.json({ inserted, matched });
  } catch (error) {
    console.error('[enrich] Error:', error);
    let message;
    if (process.env.NODE_ENV === 'development') {
      if (error instanceof Error) {
        message = error.message;
      } else {
        // Try to get a string representation, but avoid "[object Object]"
        const str = String(error);
        message = str !== '[object Object]' ? str : 'See console for error details';
      }
    } else {
      message = 'Internal server error';
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
