import type { Lead, Associate, AllocationMatchFactor, MatchRecommendation, AllocationSignal } from "./types";

export interface ScoreConfig {
  locationWeight: number; // 30
  propertyTypeWeight: number; // 20
  budgetWeight: number; // 20
  capacityWeight: number; // 15
  performanceWeight: number; // 10
  responseTimeWeight: number; // 5
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  locationWeight: 30,
  propertyTypeWeight: 20,
  budgetWeight: 20,
  capacityWeight: 15,
  performanceWeight: 10,
  responseTimeWeight: 5,
};

/**
 * Normalizes text for fuzzy keyword matching (lowercased, punctuation removed).
 */
function clean(text: string | null | undefined): string {
  if (!text) return "";
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

/**
 * Evaluates whether two location descriptions overlap (e.g., "Dubai Marina" in "Dubai Marina / Business Bay").
 */
function matchesLocation(leadArea: string | null | undefined, territories: string[] | undefined): { matched: boolean; detail: string; scoreRatio: number } {
  if (!leadArea || leadArea === "Not provided") {
    return { matched: false, detail: "No preferred area specified by lead", scoreRatio: 0.4 };
  }
  if (!territories || territories.length === 0) {
    return { matched: true, detail: "Associate covers all Dubai communities", scoreRatio: 0.6 };
  }

  const cleanLead = clean(leadArea);
  for (const t of territories) {
    const cleanTerritory = clean(t);
    if (cleanLead.includes(cleanTerritory) || cleanTerritory.includes(cleanLead)) {
      return { matched: true, detail: `Specialist covers ${t}`, scoreRatio: 1.0 };
    }
  }

  // Check word intersections
  const leadWords = cleanLead.split(/\s+/).filter((w) => w.length > 2 && !["dubai", "the", "and", "near"].includes(w));
  for (const t of territories) {
    const cleanT = clean(t);
    for (const w of leadWords) {
      if (cleanT.includes(w)) {
        return { matched: true, detail: `Adjacent area coverage (${t})`, scoreRatio: 0.65 };
      }
    }
  }

  return { matched: false, detail: `Territory mismatch (covers: ${territories.slice(0, 2).join(", ")})`, scoreRatio: 0.15 };
}

/**
 * Evaluates property type alignment (e.g. "Apartment", "Villa", "Townhouse").
 */
function matchesPropertyType(leadType: string | null | undefined, propertyTypes: string[] | undefined): { matched: boolean; detail: string; scoreRatio: number } {
  if (!leadType || leadType === "Not provided") {
    return { matched: false, detail: "No property type specified", scoreRatio: 0.5 };
  }
  if (!propertyTypes || propertyTypes.length === 0) {
    return { matched: true, detail: "Covers all residential property types", scoreRatio: 0.7 };
  }

  const cleanLead = clean(leadType);
  for (const pt of propertyTypes) {
    const cleanPt = clean(pt);
    if (cleanLead.includes(cleanPt) || cleanPt.includes(cleanLead)) {
      return { matched: true, detail: `Specialist in ${pt} properties`, scoreRatio: 1.0 };
    }
  }

  return { matched: false, detail: `Specializes in ${propertyTypes.join(", ")}`, scoreRatio: 0.2 };
}

/**
 * Evaluates budget overlap.
 */
function matchesBudget(
  leadMin: number | null | undefined,
  leadMax: number | null | undefined,
  assocMin: number | null | undefined,
  assocMax: number | null | undefined
): { matched: boolean; detail: string; scoreRatio: number } {
  const effectiveLeadMin = leadMin ?? (leadMax ? leadMax * 0.7 : null);
  const effectiveLeadMax = leadMax ?? (leadMin ? leadMin * 1.3 : null);

  if (!effectiveLeadMin && !effectiveLeadMax) {
    return { matched: false, detail: "Budget unstated by buyer", scoreRatio: 0.5 };
  }
  if (!assocMin && !assocMax) {
    return { matched: true, detail: "Handles flexible budget tiers", scoreRatio: 0.75 };
  }

  const aMin = assocMin ?? 0;
  const aMax = assocMax ?? 50_000_000;
  const lMin = effectiveLeadMin ?? aMin;
  const lMax = effectiveLeadMax ?? aMax;

  // Check overlap
  if (lMax >= aMin && lMin <= aMax) {
    return { matched: true, detail: "Deal budget aligns with specialist tier", scoreRatio: 1.0 };
  }

  // Near match (within 35%)
  const dist = Math.min(Math.abs(lMin - aMax), Math.abs(aMin - lMax));
  const maxSpan = Math.max(aMax, lMax);
  if (dist / maxSpan < 0.35) {
    return { matched: true, detail: "Near target budget band", scoreRatio: 0.6 };
  }

  return { matched: false, detail: "Budget outside typical deal range", scoreRatio: 0.2 };
}

/**
 * Evaluates workload capacity.
 */
function matchesCapacity(
  activeClients: number,
  maxCapacity: number | null | undefined
): { matched: boolean; detail: string; scoreRatio: number } {
  const cap = (maxCapacity && maxCapacity > 0) ? maxCapacity : 15;
  const ratio = activeClients / cap;

  if (ratio < 0.4) {
    return { matched: true, detail: `High bandwidth (${activeClients}/${cap} clients)`, scoreRatio: 1.0 };
  }
  if (ratio < 0.75) {
    return { matched: true, detail: `Balanced workload (${activeClients}/${cap} clients)`, scoreRatio: 0.75 };
  }
  if (ratio < 1.0) {
    return { matched: true, detail: `Near full capacity (${activeClients}/${cap} clients)`, scoreRatio: 0.4 };
  }
  return { matched: false, detail: `At maximum capacity (${activeClients}/${cap} clients)`, scoreRatio: 0.0 };
}

/**
 * Evaluates performance history.
 */
function matchesPerformance(
  conversionRate: number | null | undefined,
  score: number | null | undefined,
  closedCount: number | null | undefined
): { matched: boolean; detail: string; scoreRatio: number } {
  if (conversionRate !== undefined && conversionRate !== null && conversionRate > 15) {
    return { matched: true, detail: `Top conversion performer (${conversionRate}% conv)`, scoreRatio: 1.0 };
  }
  if (score !== undefined && score !== null && score >= 80) {
    return { matched: true, detail: `High performance score (${score}/100)`, scoreRatio: 0.9 };
  }
  if (closedCount !== undefined && closedCount !== null && closedCount > 10) {
    return { matched: true, detail: `Proven track record (${closedCount} deals closed)`, scoreRatio: 0.8 };
  }
  if (conversionRate !== undefined && conversionRate !== null && conversionRate > 8) {
    return { matched: true, detail: `Solid conversion record (${conversionRate}%)`, scoreRatio: 0.7 };
  }
  return { matched: true, detail: "Standard specialist performance", scoreRatio: 0.5 };
}

/**
 * Evaluates response time / availability.
 */
function matchesResponseTime(
  availability: string | null | undefined,
  avgMinutes: number | null | undefined
): { matched: boolean; detail: string; scoreRatio: number } {
  if (availability === "Available") {
    if (avgMinutes && avgMinutes <= 15) {
      return { matched: true, detail: `Immediate availability (<15m avg response)`, scoreRatio: 1.0 };
    }
    return { matched: true, detail: "Currently available for new dispatch", scoreRatio: 0.85 };
  }
  if (availability === "Busy") {
    return { matched: true, detail: "Active but busy with consultations", scoreRatio: 0.4 };
  }
  return { matched: false, detail: "Specialist is currently away", scoreRatio: 0.2 };
}

/**
 * Checks hard gatekeeper constraints.
 */
export function checkHardConstraints(lead: Lead, associate: Associate): { eligible: boolean; reason?: string } {
  if (associate.status === "Offline") {
    return { eligible: false, reason: "Associate status is Offline" };
  }
  if (associate.availability === "On Leave" || associate.availability === "Offline") {
    return { eligible: false, reason: `Associate is ${associate.availability}` };
  }

  const activeClients = associate.currentActiveClients ?? associate.hotLeads ?? 0;
  const maxCap = associate.maxActiveCapacity ?? 15;
  if (activeClients >= maxCap) {
    return { eligible: false, reason: `Associate at maximum capacity (${activeClients}/${maxCap})` };
  }

  // Language constraint check if lead requirements explicitly mention a specific language
  const req = clean(lead.keyRequirements);
  const arabicRequired = req.includes("arabic") || req.includes("arabic speaker");
  const russianRequired = req.includes("russian") || req.includes("russian speaker");

  if (arabicRequired && associate.languages && associate.languages.length > 0) {
    const speaksArabic = associate.languages.some((l) => clean(l).includes("arabic"));
    if (!speaksArabic) {
      return { eligible: false, reason: "Lead requires Arabic-speaking specialist" };
    }
  }
  if (russianRequired && associate.languages && associate.languages.length > 0) {
    const speaksRussian = associate.languages.some((l) => clean(l).includes("russian"));
    if (!speaksRussian) {
      return { eligible: false, reason: "Lead requires Russian-speaking specialist" };
    }
  }

  return { eligible: true };
}

/**
 * Computes a detailed match score and breakdown for a given lead and associate.
 */
export function scoreAssociateMatch(
  lead: Lead,
  associate: Associate,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG
): { score: number; factors: AllocationMatchFactor[] } {
  const factors: AllocationMatchFactor[] = [];

  // 1. Location / Territory (30 pts)
  const loc = matchesLocation(lead.preferredArea || lead.city, associate.territories);
  const locScore = Math.round(loc.scoreRatio * config.locationWeight);
  factors.push({
    signal: "Location",
    score: locScore,
    maxScore: config.locationWeight,
    matched: loc.matched,
    detail: loc.detail,
  });

  // 2. Property Type (20 pts)
  const prop = matchesPropertyType(lead.propertyType, associate.propertyTypes);
  const propScore = Math.round(prop.scoreRatio * config.propertyTypeWeight);
  factors.push({
    signal: "PropertyType",
    score: propScore,
    maxScore: config.propertyTypeWeight,
    matched: prop.matched,
    detail: prop.detail,
  });

  // 3. Budget Alignment (20 pts)
  const bud = matchesBudget(lead.budgetMin, lead.budgetMax, associate.budgetMin, associate.budgetMax);
  const budScore = Math.round(bud.scoreRatio * config.budgetWeight);
  factors.push({
    signal: "Budget",
    score: budScore,
    maxScore: config.budgetWeight,
    matched: bud.matched,
    detail: bud.detail,
  });

  // 4. Capacity / Workload (15 pts)
  const activeCount = associate.currentActiveClients ?? associate.hotLeads ?? 0;
  const maxCap = associate.maxActiveCapacity ?? 15;
  const cap = matchesCapacity(activeCount, maxCap);
  const capScore = Math.round(cap.scoreRatio * config.capacityWeight);
  factors.push({
    signal: "Capacity",
    score: capScore,
    maxScore: config.capacityWeight,
    matched: cap.matched,
    detail: cap.detail,
  });

  // 5. Performance (10 pts)
  const perf = matchesPerformance(associate.historicalConversionRate, associate.performanceScore, associate.totalClosedAllTime);
  const perfScore = Math.round(perf.scoreRatio * config.performanceWeight);
  factors.push({
    signal: "Performance",
    score: perfScore,
    maxScore: config.performanceWeight,
    matched: perf.matched,
    detail: perf.detail,
  });

  // 6. Response Time (5 pts)
  const resp = matchesResponseTime(associate.availability, associate.averageResponseMinutes);
  const respScore = Math.round(resp.scoreRatio * config.responseTimeWeight);
  factors.push({
    signal: "ResponseTime",
    score: respScore,
    maxScore: config.responseTimeWeight,
    matched: resp.matched,
    detail: resp.detail,
  });

  const totalScore = Math.min(100, Math.max(0, factors.reduce((sum, f) => sum + f.score, 0)));

  return { score: totalScore, factors };
}

/**
 * Pure allocation matching engine. Evaluates all associates, applies hard constraints,
 * calculates match factors, and returns ranked recommendations.
 */
export function rankAssociateRecommendations(
  lead: Lead,
  associates: Associate[],
  config: ScoreConfig = DEFAULT_SCORE_CONFIG
): MatchRecommendation[] {
  const recommendations: MatchRecommendation[] = [];

  for (const associate of associates) {
    const constraint = checkHardConstraints(lead, associate);
    const match = scoreAssociateMatch(lead, associate, config);

    recommendations.push({
      associate,
      score: constraint.eligible ? match.score : 0,
      factors: match.factors,
      eligible: constraint.eligible,
      ineligibilityReason: constraint.reason ?? null,
    });
  }

  // Sort eligible first (by descending score, then lower active load, then name), then ineligible
  return recommendations.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    const aLoad = a.associate.currentActiveClients ?? a.associate.hotLeads ?? 0;
    const bLoad = b.associate.currentActiveClients ?? b.associate.hotLeads ?? 0;
    if (aLoad !== bLoad) return aLoad - bLoad;
    return a.associate.name.localeCompare(b.associate.name);
  });
}
