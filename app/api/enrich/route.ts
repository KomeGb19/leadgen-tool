import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { searchPlaces, staticSatelliteUrl } from "@/lib/places";
import { searchCarrierByName, pickBestMatch } from "@/lib/fmcsa";
import { scoreLead } from "@/lib/scoring";
import { getStateName } from "@/lib/stateUtils";
import { searchCompanyFoundedYear, calculateYearsInBusiness } from "@/lib/exa";

/** Extract city name from query strings. For our simplified format, we don't use a specific city. */
function extractCityFromQuery(query: string): string {
  // We're using format: "[service] [stateName]" so there's no specific city to extract
  return '';
}

/** Generate search queries for a given state */
function generateQueriesForState(stateCode: string): string[] {
  const stateName = getStateName(stateCode);
  return [
    `septic tank pumping ${stateName}`,
    `grease trap cleaning ${stateName}`
  ];
}

export async function POST(request: Request) {
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

    // Get state from request body, default to WA
    const body = await request.json();
    const stateCode = body.state ?? "WA";

    const supabase = supabaseServer();
    let inserted = 0;
    let matched = 0;

    const queries = generateQueriesForState(stateCode);

    for (const q of queries) {
      const places = await searchPlaces(q);

      for (const place of places) {
        try {
          const category = q.includes("septic") ? "septic" : "grease_trap";

          const city = extractCityFromQuery(q);
          // Try to get founding year from Exa
          let yearsInBusiness: number | undefined;
          try {
            const exaResult = await searchCompanyFoundedYear(place.name, place.address);
            if (exaResult?.founded_year !== null && exaResult?.founded_year !== undefined) {
              yearsInBusiness = calculateYearsInBusiness(exaResult.founded_year);
            }
          } catch (err) {
            console.error("[enrich] Exa lookup failed:", err);
            // Continue without years_in_business
          }

          const { data: company, error: companyError } = await supabase
            .from("companies")
            .upsert(
              {
                name: place.name,
                address: place.address,
                ...(city ? { city } : {}),
                state: stateCode,
                lat: place.lat,
                lng: place.lng,
                phone: place.phone,
                website: place.website,
                source: "google_places",
                category,
                review_count: place.userRatingCount,
                rating: place.rating,
                years_in_business: yearsInBusiness,
              },
              { onConflict: "name,address" }
            )
            .select()
            .single();

          if (companyError) {
            console.error(`[enrich] company upsert error for ${place.name}:`, companyError);
            // Continue to next place rather than failing the whole batch
            continue;
          }

          if (!company) {
            console.warn(`[enrich] no company data returned for ${place.name} (possibly duplicate)`);
            continue;
          }

          if (!company) {
            console.warn(`[enrich] no company data returned for ${place.name} (possibly duplicate)`);
            continue;
          }

          inserted++;
          console.log(`[enrich] inserted/updated company: ${place.name}, years_in_business: ${yearsInBusiness}`);

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
