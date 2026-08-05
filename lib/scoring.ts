import type { Company, FmcsaRecord, Imagery } from "./types";

/**
 * Weighted lead score, 0-100.
 * FMCSA self-reported fleet size is the most trustworthy signal, so it
 * dominates the score. Imagery-based truck counts fill the gap when a
 * company has no FMCSA record (too small to need a USDOT number).
 * Review volume and longevity are minor tie-breakers.
 */
export function scoreLead(
  company: Pick<Company, "reviewCount" | "rating" | "yearsInBusiness">,
  fmcsa?: Pick<FmcsaRecord, "powerUnits" | "operatingStatus">,
  imagery?: Pick<Imagery, "truckCountEstimate">
): number {
  let score = 0;

  const fleetSize = fmcsa?.powerUnits ?? imagery?.truckCountEstimate ?? 0;
  const fleetWeight = fmcsa?.powerUnits ? 1 : 0.6; // discount unverified estimates
  score += Math.min(fleetSize * 6, 55) * fleetWeight;

  if (fmcsa?.operatingStatus === "AUTHORIZED" || fmcsa?.operatingStatus === "ACTIVE") {
    score += 10;
  }

  if (company.reviewCount) {
    score += Math.min(Math.log10(company.reviewCount + 1) * 8, 15);
  }
  if (company.rating) {
    score += (company.rating - 3) * 4;
  }
  if (company.yearsInBusiness) {
    score += Math.min(company.yearsInBusiness / 2, 10);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreTier(score: number): "hot" | "warm" | "cold" {
  if (score >= 65) return "hot";
  if (score >= 35) return "warm";
  return "cold";
}
