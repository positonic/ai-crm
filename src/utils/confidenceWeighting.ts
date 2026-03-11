/**
 * Utilities for calculating multi-factor weighted scores in the evaluation system
 * Supports confidence-based, competency-based, and manual weighting
 */

export interface ReviewerScore {
  reviewerId: string;
  reviewerName: string | null;
  reviewerEmail: string | null;
  reviewerImage: string | null;
  overallScore: number;
  confidence: number;
  recommendation: "ACCEPT" | "REJECT" | "WAITLIST" | "NEEDS_MORE_INFO";
  completedAt: Date | null;
}

export interface ReviewerCompetency {
  category: string; // CriteriaCategory
  competencyLevel: number; // 1-5 scale
  baseWeight: number; // Manual weight override
}

export interface EnhancedReviewerScore extends ReviewerScore {
  competencies?: ReviewerCompetency[]; // Optional competency data
}

export interface WeightedReviewerScore extends ReviewerScore {
  weightedScore: number;
  confidenceWeight: number;
  competencyWeight: number;
  finalWeight: number;
  competencies?: ReviewerCompetency[];
}

/**
 * Calculate confidence weight using linear weighting
 * Confidence 5/5 = 1.0, 4/5 = 0.8, 3/5 = 0.6, 2/5 = 0.4, 1/5 = 0.2
 */
export function calculateConfidenceWeight(confidence: number): number {
  // Ensure confidence is within valid range (1-5)
  const clampedConfidence = Math.max(1, Math.min(5, confidence));
  return clampedConfidence / 5;
}

/**
 * Apply confidence weighting to a score
 */
export function applyConfidenceWeighting(
  score: number,
  confidence: number,
): number {
  const weight = calculateConfidenceWeight(confidence);
  return score * weight;
}

/**
 * Calculate competency weight using linear weighting
 * Competency 5/5 = 1.25, 4/5 = 1.1, 3/5 = 1.0, 2/5 = 0.9, 1/5 = 0.75
 * This allows experts to have slightly more weight than novices
 */
export function calculateCompetencyWeight(
  competencyLevel: number,
  baseWeight = 1.0,
): number {
  // Ensure competency is within valid range (1-5)
  const clampedCompetency = Math.max(1, Math.min(5, competencyLevel));

  // Scale: 1->0.75, 2->0.9, 3->1.0, 4->1.1, 5->1.25
  const competencyMultiplier = 0.5 + clampedCompetency * 0.15;

  return baseWeight * competencyMultiplier;
}

/**
 * Calculate category-specific competency weight for a reviewer
 * If no competency data exists for the category, defaults to neutral (1.0)
 */
export function calculateCategoryCompetencyWeight(
  competencies: ReviewerCompetency[] | undefined,
  category: string,
): number {
  if (!competencies) return 1.0;

  const categoryCompetency = competencies.find((c) => c.category === category);
  if (!categoryCompetency) return 1.0;

  return calculateCompetencyWeight(
    categoryCompetency.competencyLevel,
    categoryCompetency.baseWeight,
  );
}

/**
 * Calculate overall competency weight as average across all categories
 */
export function calculateOverallCompetencyWeight(
  competencies: ReviewerCompetency[] | undefined,
): number {
  if (!competencies || competencies.length === 0) return 1.0;

  const totalWeight = competencies.reduce((sum, comp) => {
    return (
      sum + calculateCompetencyWeight(comp.competencyLevel, comp.baseWeight)
    );
  }, 0);

  return totalWeight / competencies.length;
}

/**
 * Calculate final multi-factor weight combining confidence, competency, and base weights
 */
export function calculateFinalWeight(
  confidence: number,
  competencies?: ReviewerCompetency[],
  category?: string,
): { confidenceWeight: number; competencyWeight: number; finalWeight: number } {
  const confidenceWeight = calculateConfidenceWeight(confidence);

  const competencyWeight = category
    ? calculateCategoryCompetencyWeight(competencies, category)
    : calculateOverallCompetencyWeight(competencies);

  const finalWeight = confidenceWeight * competencyWeight;

  return {
    confidenceWeight,
    competencyWeight,
    finalWeight,
  };
}

/**
 * Calculate weighted scores for all reviewers (backward compatible)
 */
export function calculateWeightedScores(
  reviewerScores: ReviewerScore[],
): WeightedReviewerScore[] {
  return calculateEnhancedWeightedScores(reviewerScores);
}

/**
 * Calculate enhanced weighted scores with competency support
 */
export function calculateEnhancedWeightedScores(
  reviewerScores: EnhancedReviewerScore[],
  category?: string,
): WeightedReviewerScore[] {
  return reviewerScores.map((reviewer) => {
    const weights = calculateFinalWeight(
      reviewer.confidence,
      reviewer.competencies,
      category,
    );
    const weightedScore = reviewer.overallScore * weights.finalWeight;

    return {
      ...reviewer,
      weightedScore,
      confidenceWeight: weights.confidenceWeight,
      competencyWeight: weights.competencyWeight,
      finalWeight: weights.finalWeight,
      competencies: reviewer.competencies,
    };
  });
}

/**
 * Get consensus indicators based on reviewer recommendations and confidence
 */
export function getConsensusIndicator(
  weightedScores: WeightedReviewerScore[],
): {
  type:
    | "strong_accept"
    | "lean_accept"
    | "mixed"
    | "lean_reject"
    | "strong_reject"
    | "uncertain";
  label: string;
  description: string;
} {
  if (weightedScores.length === 0) {
    return {
      type: "uncertain",
      label: "No Reviews",
      description: "No completed reviews available",
    };
  }

  // Count recommendations by type, weighted by final weight (confidence + competency)
  const recommendationCounts = weightedScores.reduce(
    (acc, reviewer) => {
      const weight = reviewer.finalWeight ?? reviewer.confidenceWeight; // Fallback for backward compatibility
      acc[reviewer.recommendation] =
        (acc[reviewer.recommendation] ?? 0) + weight;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalWeight = weightedScores.reduce(
    (sum, r) => sum + (r.finalWeight ?? r.confidenceWeight),
    0,
  );
  const acceptWeight = recommendationCounts.ACCEPT ?? 0;
  const rejectWeight = recommendationCounts.REJECT ?? 0;
  const acceptPercentage = acceptWeight / totalWeight;
  const rejectPercentage = rejectWeight / totalWeight;

  // Determine consensus type
  if (acceptPercentage >= 0.8) {
    return {
      type: "strong_accept",
      label: "Strong Accept",
      description: `${Math.round(acceptPercentage * 100)}% weighted acceptance`,
    };
  } else if (acceptPercentage >= 0.6) {
    return {
      type: "lean_accept",
      label: "Lean Accept",
      description: `${Math.round(acceptPercentage * 100)}% weighted acceptance`,
    };
  } else if (rejectPercentage >= 0.8) {
    return {
      type: "strong_reject",
      label: "Strong Reject",
      description: `${Math.round(rejectPercentage * 100)}% weighted rejection`,
    };
  } else if (rejectPercentage >= 0.6) {
    return {
      type: "lean_reject",
      label: "Lean Reject",
      description: `${Math.round(rejectPercentage * 100)}% weighted rejection`,
    };
  } else {
    return {
      type: "mixed",
      label: "Mixed Reviews",
      description: "Reviewers have conflicting recommendations",
    };
  }
}

/**
 * Get color for confidence level (for UI display)
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 5) return "green";
  if (confidence >= 4) return "blue";
  if (confidence >= 3) return "yellow";
  if (confidence >= 2) return "orange";
  return "red";
}

/**
 * Get color for consensus type (for UI display)
 */
export function getConsensusColor(type: string): string {
  switch (type) {
    case "strong_accept":
    case "lean_accept":
      return "green";
    case "strong_reject":
    case "lean_reject":
      return "red";
    case "mixed":
      return "yellow";
    case "uncertain":
    default:
      return "gray";
  }
}

/**
 * Get color for competency level (for UI display)
 */
export function getCompetencyColor(competencyLevel: number): string {
  if (competencyLevel >= 5) return "green";
  if (competencyLevel >= 4) return "blue";
  if (competencyLevel >= 3) return "yellow";
  if (competencyLevel >= 2) return "orange";
  return "red";
}

/**
 * Get competency level label
 */
export function getCompetencyLabel(competencyLevel: number): string {
  switch (competencyLevel) {
    case 5:
      return "Expert";
    case 4:
      return "Advanced";
    case 3:
      return "Competent";
    case 2:
      return "Developing";
    case 1:
      return "Novice";
    default:
      return "Unknown";
  }
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  switch (category) {
    case "TECHNICAL":
      return "Technical";
    case "PROJECT":
      return "Project";
    case "COMMUNITY_FIT":
      return "Community Fit";
    case "VIDEO":
      return "Video Assessment";
    case "ENTREPRENEURIAL":
      return "Entrepreneurial";
    case "OVERALL":
      return "Overall";
    default:
      return category.replace("_", " ");
  }
}
