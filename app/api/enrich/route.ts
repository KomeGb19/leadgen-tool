import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseServer } from "@/lib/supabase";
import { searchPlaces, staticSatelliteUrl } from "@/lib/places";
import { searchCarrierByName, pickBestMatch } from "@/lib/fmcsa";
import { scoreLead } from "@/lib/scoring";
import { getStateName } from "@/lib/stateUtils";
import { searchCompanyFoundedYear, calculateYearsInBusiness } from "@/lib/exa";
import { getUserPermissionsFromRequest } from "@/lib/auth-server"
import { pool } from "@/lib/pool"

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

    // Get user permissions from request
    const userPermissions = await getUserPermissionsFromRequest(request);

    // If no valid user session, return unauthorized
    if (!userPermissions) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get state from request body, default to WA
    const body = await request.json();
    const stateCode = body.state ?? "WA";

    // Check if user has access to this state
    const hasStateAccess =
      userPermissions.isSuperUser ||
      (userPermissions.allowedStates !== null && userPermissions.allowedStates.includes(stateCode));

    if (!hasStateAccess) {
      return NextResponse.json({
        error: `Insufficient permissions to access state: ${stateCode}`
      }, { status: 403 });
    }

    const supabase = supabaseServer();
    let inserted = 0;
    let matched = 0;
    let refreshed = 0;

    // Part 1: Process new companies from Google Places search
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

    // Part 2: Refresh existing companies in the database for this state
    // Fetch existing companies respecting user permissions
    let companiesQuery = supabase
      .from("companies")
      .select("id, name, address, city, state, lat, lng")
      .eq("state", stateCode);

    // Apply state filtering based on user permissions (same as in leads route)
    if (!userPermissions.isSuperUser && userPermissions.allowedStates !== null) {
      companiesQuery = companiesQuery.in("state", userPermissions.allowedStates);
    }

    const { data: existingCompanies, error: companiesError } = await companiesQuery;

    if (companiesError) {
      console.error("[enrich] error fetching existing companies:", companiesError);
      // Continue anyway - we still processed new companies from Google Places
    } else if (existingCompanies && existingCompanies.length > 0) {
      console.log(`[enrich] refreshing ${existingCompanies.length} existing companies for state ${stateCode}`);

      // Process each existing company to refresh FMCSA and imagery data
      const results = await pool(existingCompanies, 8, async (company): Promise<void> => {
        try {
          // Refresh FMCSA data by looking up the carrier by name
          let fmcsa;
          try {
            const candidates = await searchCarrierByName(company.name);
            // Use city from company record for better matching
            fmcsa = pickBestMatch(candidates, company.city ?? "");
          } catch (err) {
            console.error(`[enrich] FMCSA lookup failed for ${company.name}:`, err);
            fmcsa = undefined;
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
              matched++; // Count as matched since we updated FMCSA data
            } catch (err) {
              console.error(`[enrich] fmcsa upsert error for ${company.name}:`, err);
            }
          }

          // Refresh imagery with latest static satellite image
          try {
            await supabase.from("imagery").upsert(
              {
                company_id: company.id,
                image_url: staticSatelliteUrl(company.lat, company.lng),
                source: "google_static",
                captured_date: new Date().toISOString().slice(0, 10),
              },
              { onConflict: "company_id" }
            );
          } catch (err) {
            console.error(`[enrich] imagery upsert error for ${company.name}:`, err);
          }

          // Update lead score if FMCSA data changed or for consistency
          try {
            // Get current company data to compute score
            const { data: companyData } = await supabase
              .from("companies")
              .select("review_count, rating")
              .eq("id", company.id)
              .single();

            // Get current FMCSA data
            const { data: fmcsaData } = await supabase
              .from("fmcsa_records")
              .select("power_units, operating_status")
              .eq("company_id", company.id)
              .single();

            const newScore = scoreLead(
              {
                reviewCount: companyData?.review_count,
                rating: companyData?.rating
              },
              fmcsaData ? {
                powerUnits: fmcsaData?.power_units,
                operatingStatus: fmcsaData?.operating_status
              } : undefined
            );

            await supabase
              .from("leads")
              .upsert(
                {
                  company_id: company.id,
                  score: newScore,
                },
                { onConflict: "company_id" }
              );
          } catch (err) {
            console.error(`[enrich] score update error for ${company.name}:`, err);
          }

          // Exa lookup for years_in_business (if not already set or to refresh)
          let yearsInBusinessUpdate: number | undefined;
          try {
            const exaResult = await searchCompanyFoundedYear(company.name, company.city ?? "");
            if (exaResult?.founded_year !== null && exaResult?.founded_year !== undefined) {
              yearsInBusinessUpdate = calculateYearsInBusiness(exaResult.founded_year);
            }
          } catch (exaErr) {
            console.error(`[enrich] Exa lookup failed for ${company.name}:`, exaErr);
          }

          // Update years_in_business if we obtained a new value
          if (yearsInBusinessUpdate !== undefined) {
            try {
              await supabase
                .from("companies")
                .update({ years_in_business: yearsInBusinessUpdate })
                .eq("id", company.id);
            } catch (updateErr) {
              console.error(`[enrich] years_in_business update failed for ${company.name}:`, updateErr);
            }
          }

          refreshed++;
        } catch (err) {
          console.error(`[enrich] error refreshing company ${company.name}:`, err);
          // Continue to next company
        }
      });
    }

    return NextResponse.json({
      inserted,
      matched,
      refreshed  // New field showing how many existing companies were refreshed
    });
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
