export interface ExaCompanyResult {
  founded_year: number;
  company: string;
  ceo?: string;
  headquarters?: string;
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