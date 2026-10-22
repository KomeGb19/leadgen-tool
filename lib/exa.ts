export interface ExaCompanyResult {
  founded_year: number;
  company: string;
  ceo?: string;
  headquarters?: string;
}

export interface ExaOwnershipResult {
  ownership_status: "independent" | "pe_backed" | "owned_by_strategic" | "unknown";
  parent_company?: string | null;
  acquisition_year?: number | null;
  confidence: "high" | "medium" | "low";
  sources?: string[];
}

function exaApiKey(): string {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("EXA_API_KEY is not set");
  return key;
}

export async function searchCompanyFoundedYear(
  companyName: string,
  locationHint?: string
): Promise<ExaCompanyResult | null> {
  try {
    console.log(`[exa] Searching for company: ${companyName}`);
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${exaApiKey()}`,
      },
      body: JSON.stringify({
        query: `${companyName} ${locationHint || ""} founding year established`,
        type: "deep",
        outputSchema: {
          type: "object",
          required: ["founded_year", "company"],
          properties: {
            founded_year: { type: "number" },
            company: { type: "string" },
            ceo: { type: "string" },
            headquarters: { type: "string" }
          }
        }
      })
    });

    console.log(`[exa] Response status: ${res.status}`);
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[exa] Exa search failed: ${res.status}, body: ${errorText}`);
      throw new Error(`Exa search failed: ${res.status}`);
    }

    const data = await res.json();
    console.log(`[exa] Received data:`, data);
    // With outputSchema, the structured data is in output.content
    return data.output?.content ?? null;
  } catch (error) {
    console.error("[exa] Error searching company:", error);
    return null;
  }
}

export async function searchCompanyOwnership(
  companyName: string,
  locationHint?: string
): Promise<ExaOwnershipResult | null> {
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${exaApiKey()}`,
      },
      body: JSON.stringify({
        query: `Determine the ownership structure for ${companyName}${locationHint ? ` in ${locationHint}` : ""}. Provide only a structured result with: ownership_status as one of independent, pe_backed, owned_by_strategic, or unknown; parent_company as the owning firm if publicly identified; acquisition_year as the year of the acquisition if explicitly stated; confidence as high, medium, or low; sources as a list of supporting URLs. If there is no clear evidence, set ownership_status to unknown, parent_company to null, acquisition_year to null, confidence to low, and sources to [].`,
        type: "deep",
        outputSchema: {
          type: "object",
          required: ["ownership_status", "confidence", "sources"],
          properties: {
            ownership_status: {
              type: "string",
              enum: ["independent", "pe_backed", "owned_by_strategic", "unknown"]
            },
            parent_company: { type: ["string", "null"] },
            acquisition_year: { type: ["number", "null"] },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"]
            },
            sources: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[exa] Ownership lookup failed: ${res.status}, body: ${errorText}`);
      return null;
    }

    const data = await res.json();
    const ownership = data.output?.content ?? null;

    if (!ownership) return null;

    return {
      ownership_status: ["independent", "pe_backed", "owned_by_strategic", "unknown"].includes(
        ownership.ownership_status
      )
        ? ownership.ownership_status
        : "unknown",
      parent_company: ownership.parent_company ?? null,
      acquisition_year:
        typeof ownership.acquisition_year === "number" ? ownership.acquisition_year : null,
      confidence: ["high", "medium", "low"].includes(ownership.confidence)
        ? ownership.confidence
        : "low",
      sources: Array.isArray(ownership.sources) ? ownership.sources : [],
    };
  } catch (error) {
    console.error("[exa] Error researching ownership:", error);
    return null;
  }
}

/**
 * Calculate years in business from founding year
 * Returns 0 for future founding years (data error protection)
 */
export function calculateYearsInBusiness(foundedYear: number): number {
  const currentYear = new Date().getFullYear();
  const years = currentYear - foundedYear;
  // Protect against future founding years (data errors)
  return years >= 0 ? years : 0;
}