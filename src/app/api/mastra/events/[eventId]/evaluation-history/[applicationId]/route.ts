import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

// Type definitions for API responses
interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  profile?: {
    company: string | null;
    jobTitle: string | null;
  } | null;
}
interface EventInfo {
  id: string;
  name: string;
  description: string | null;
}

interface QuestionInfo {
  questionKey: string | null;
  questionEn: string;
  questionType: string;
  order: number;
}

interface ResponseInfo {
  answer: unknown;
  question: QuestionInfo;
}

interface ReviewerCompetency {
  category: string;
  competencyLevel: number;
  baseWeight: number;
}

interface ReviewerInfo {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  reviewerCompetencies: ReviewerCompetency[];
}

interface CriteriaInfo {
  id: string;
  name: string;
  description: string | null;
  category: string;
  weight: number;
  minScore: number;
  maxScore: number;
  order: number;
}

interface ScoreInfo {
  criteriaId: string;
  score: number;
  reasoning: string | null;
  createdAt: Date;
  updatedAt: Date;
  criteria: CriteriaInfo;
}

interface CommentInfo {
  id: string;
  questionKey: string | null;
  comment: string;
  isPrivate: boolean;
  createdAt: Date;
}

interface EvaluationInfo {
  id: string;
  reviewerId: string;
  stage: string;
  status: string;
  overallScore: number | null;
  confidence: number | null;
  recommendation: string | null;
  overallComments: string | null;
  timeSpentMinutes: number | null;
  videoWatched: boolean | null;
  videoQuality: string | null;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  reviewer: ReviewerInfo;
  scores: ScoreInfo[];
  comments: CommentInfo[];
}

interface ApplicationData {
  id: string;
  userId: string;
  status: string;
  language: string | null;
  isComplete: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: UserProfile | null;
  event: EventInfo;
  responses: ResponseInfo[];
}

interface ConsensusInfo {
  id: string;
  finalDecision: string;
  consensusScore: number | null;
  discussionNotes: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}
async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string; applicationId: string }> },
) {
  const { eventId, applicationId } = await context.params;

  try {
    // Verify application belongs to this event
    const application = await db.application.findFirst({
      where: {
        id: applicationId,
        eventId: eventId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
          include: {
            profile: {
              select: {
                company: true,
                jobTitle: true,
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        responses: {
          include: {
            question: {
              select: {
                questionKey: true,
                questionEn: true,
                questionType: true,
                order: true,
              },
            },
          },
          orderBy: {
            question: { order: "asc" },
          },
        },
      },
    });

    if (!application) {
      return Response.json(
        {
          success: false,
          error: "Application not found or doesn't belong to this event",
        },
        { status: 404 },
      );
    }

    const typedApplication = application as ApplicationData;

    // Get complete evaluation history for this application
    const evaluations = await db.applicationEvaluation.findMany({
      where: {
        applicationId: applicationId,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            reviewerCompetencies: {
              select: {
                category: true,
                competencyLevel: true,
                baseWeight: true,
              },
            },
          },
        },
        scores: {
          include: {
            criteria: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                weight: true,
                minScore: true,
                maxScore: true,
                order: true,
              },
            },
          },
          orderBy: {
            criteria: { order: "asc" },
          },
        },
        comments: {
          select: {
            id: true,
            questionKey: true,
            comment: true,
            isPrivate: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const typedEvaluations = evaluations as EvaluationInfo[];

    // Get any consensus decisions for this application
    const consensus = (await db.reviewConsensus.findFirst({
      where: {
        applicationId: applicationId,
      },
    })) as ConsensusInfo | null; // Transform evaluations with detailed history
    const evaluationHistory = typedEvaluations.map((evaluation) => {
      const isAIReviewer =
        evaluation.reviewer.email === "ai-reviewer@fundingthecommons.io";

      return {
        id: evaluation.id,
        reviewer: {
          id: evaluation.reviewer.id,
          name: evaluation.reviewer.name,
          email: evaluation.reviewer.email,
          role: evaluation.reviewer.role,
          isAI: isAIReviewer,
          competencies:
            evaluation.reviewer.reviewerCompetencies?.map((comp) => ({
              category: comp.category,
              level: comp.competencyLevel,
              weight: comp.baseWeight,
            })) ?? [],
        },
        evaluation: {
          stage: evaluation.stage,
          status: evaluation.status,
          overallScore: evaluation.overallScore,
          confidence: evaluation.confidence,
          recommendation: evaluation.recommendation,
          overallComments: evaluation.overallComments,
          timeSpentMinutes: evaluation.timeSpentMinutes,
          videoWatched: evaluation.videoWatched,
          videoQuality: evaluation.videoQuality,
          createdAt: evaluation.createdAt,
          completedAt: evaluation.completedAt,
          updatedAt: evaluation.updatedAt,
        },
        scores: evaluation.scores.map((score) => ({
          criteriaId: score.criteriaId,
          criteriaName: score.criteria.name,
          criteriaDescription: score.criteria.description,
          criteriaCategory: score.criteria.category,
          criteriaWeight: score.criteria.weight,
          scoreRange: {
            min: score.criteria.minScore,
            max: score.criteria.maxScore,
          },
          score: score.score,
          normalizedScore:
            (score.score - score.criteria.minScore) /
            (score.criteria.maxScore - score.criteria.minScore),
          reasoning: score.reasoning,
          createdAt: score.createdAt,
          updatedAt: score.updatedAt,
        })),
        comments: evaluation.comments.map((comment) => ({
          id: comment.id,
          questionKey: comment.questionKey,
          comment: comment.comment,
          isPrivate: comment.isPrivate,
          createdAt: comment.createdAt,
        })),
        // AI metadata if available
        aiMetadata: null,
      };
    });

    // Calculate evaluation analytics
    const validScores = typedEvaluations
      .map((e) => e.overallScore)
      .filter((score): score is number => score !== null);

    const analytics = {
      totalEvaluations: typedEvaluations.length,
      completedEvaluations: typedEvaluations.filter(
        (e) => e.status === "COMPLETED",
      ).length,
      uniqueReviewers: new Set(typedEvaluations.map((e) => e.reviewerId)).size,
      aiEvaluations: typedEvaluations.filter(
        (e) => e.reviewer.email === "ai-reviewer@fundingthecommons.io",
      ).length,
      humanEvaluations: typedEvaluations.filter(
        (e) => e.reviewer.email !== "ai-reviewer@fundingthecommons.io",
      ).length,

      scoreAnalysis: {
        averageOverallScore:
          validScores.length > 0
            ? validScores.reduce((sum, score) => sum + score, 0) /
              validScores.length
            : null,
        scoreRange:
          validScores.length > 0
            ? {
                min: Math.min(...validScores),
                max: Math.max(...validScores),
              }
            : { min: null, max: null },
        scoreVariance:
          validScores.length > 1 ? calculateVariance(validScores) : 0,
      },

      recommendationConsensus: typedEvaluations
        .map((e) => e.recommendation)
        .filter((rec): rec is string => rec !== null)
        .reduce(
          (acc, rec) => {
            acc[rec] = (acc[rec] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),

      confidenceAnalysis: {
        averageConfidence: (() => {
          const validConfidence = typedEvaluations
            .map((e) => e.confidence)
            .filter((conf): conf is number => conf !== null);
          return validConfidence.length > 0
            ? validConfidence.reduce((sum, conf) => sum + conf, 0) /
                validConfidence.length
            : null;
        })(),
        confidenceDistribution: typedEvaluations
          .map((e) => e.confidence)
          .filter((conf): conf is number => conf !== null)
          .reduce(
            (acc, conf) => {
              acc[conf] = (acc[conf] ?? 0) + 1;
              return acc;
            },
            {} as Record<number, number>,
          ),
      },

      timeAnalysis: {
        averageTimeSpent: (() => {
          const validTimes = typedEvaluations
            .map((e) => e.timeSpentMinutes)
            .filter((time): time is number => time !== null);
          return validTimes.length > 0
            ? validTimes.reduce((sum, time) => sum + time, 0) /
                validTimes.length
            : null;
        })(),
        totalTimeSpent: typedEvaluations
          .map((e) => e.timeSpentMinutes)
          .filter((time): time is number => time !== null)
          .reduce((sum, time) => sum + time, 0),
      },

      timeline: {
        firstEvaluation: typedEvaluations[0]?.createdAt ?? null,
        lastEvaluation:
          typedEvaluations[typedEvaluations.length - 1]?.completedAt ?? null,
        evaluationDuration: (() => {
          const lastEval = typedEvaluations[typedEvaluations.length - 1];
          const firstEval = typedEvaluations[0];
          return typedEvaluations.length > 0 &&
            firstEval &&
            lastEval?.completedAt
            ? new Date(lastEval.completedAt).getTime() -
                new Date(firstEval.createdAt).getTime()
            : null;
        })(),
      },
    };
    // Identify evaluation patterns and insights
    const insights = {
      reviewerAgreement: calculateReviewerAgreement(typedEvaluations),
      biasIndicators: detectBiasIndicators(evaluationHistory),
      qualityFlags: detectQualityFlags(typedEvaluations),
      urgencyLevel: determineUrgencyLevel(
        typedEvaluations,
        typedApplication.status,
      ),
      nextRecommendedActions: getNextRecommendedActions(
        typedEvaluations,
        typedApplication.status,
        consensus,
      ),
    };

    return Response.json({
      success: true,
      data: {
        eventId,
        application: {
          id: typedApplication.id,
          userId: typedApplication.userId,
          status: typedApplication.status,
          language: typedApplication.language,
          isComplete: typedApplication.isComplete,
          submittedAt: typedApplication.submittedAt,
          createdAt: typedApplication.createdAt,
          updatedAt: typedApplication.updatedAt,
        },
        applicant: typedApplication.user,
        event: typedApplication.event,
        responses: typedApplication.responses.map((response) => ({
          questionKey: response.question.questionKey,
          questionText: response.question.questionEn,
          questionType: response.question.questionType,
          answer: response.answer,
          order: response.question.order,
        })),
        evaluationHistory,
        consensus: consensus
          ? {
              id: consensus.id,
              finalDecision: consensus.finalDecision,
              consensusScore: consensus.consensusScore,
              discussionNotes: consensus.discussionNotes,

              decidedAt: consensus.decidedAt,
              createdAt: consensus.createdAt,
            }
          : null,
        analytics,
        insights,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose:
            "Complete evaluation history for single application analysis",
          dataCompleteness: `${typedEvaluations.length} evaluations with full scoring and comments`,
        },
      },
    });
  } catch (error) {
    console.error("[MASTRA API] Error fetching evaluation history:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to fetch evaluation history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Helper functions
function calculateVariance(numbers: number[]): number {
  if (numbers.length < 2) return 0;
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  return (
    numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length
  );
}

function calculateReviewerAgreement(evaluations: EvaluationInfo[]): number {
  if (evaluations.length < 2) return 100;

  const recommendations = evaluations
    .map((e) => e.recommendation)
    .filter((rec): rec is string => rec !== null);
  const scores = evaluations
    .map((e) => e.overallScore)
    .filter((score): score is number => score !== null);

  // Simple agreement calculation
  const recAgreement = new Set(recommendations).size === 1 ? 100 : 0;
  const scoreVariance =
    scores.length > 1 ? Math.sqrt(calculateVariance(scores)) : 0;
  const scoreAgreement = scoreVariance < 10 ? 100 - scoreVariance : 0;

  return (recAgreement + scoreAgreement) / 2;
}

interface EvaluationHistoryItem {
  reviewer: {
    isAI: boolean;
  };
  evaluation: {
    overallScore: number | null;
  };
}

function detectBiasIndicators(
  evaluationHistory: EvaluationHistoryItem[],
): string[] {
  const indicators: string[] = [];

  const aiEvals = evaluationHistory.filter((e) => e.reviewer.isAI);
  const humanEvals = evaluationHistory.filter((e) => !e.reviewer.isAI);

  if (aiEvals.length > 0 && humanEvals.length > 0) {
    const aiAvgScore =
      aiEvals.reduce((sum, e) => sum + (e.evaluation.overallScore ?? 0), 0) /
      aiEvals.length;
    const humanAvgScore =
      humanEvals.reduce((sum, e) => sum + (e.evaluation.overallScore ?? 0), 0) /
      humanEvals.length;

    if (Math.abs(aiAvgScore - humanAvgScore) > 15) {
      indicators.push("Significant AI-Human scoring divergence detected");
    }
  }

  return indicators;
}

function detectQualityFlags(evaluations: EvaluationInfo[]): string[] {
  const flags: string[] = [];

  const rapidEvals = evaluations.filter(
    (e) => e.timeSpentMinutes && e.timeSpentMinutes < 5,
  );
  if (rapidEvals.length > 0) {
    flags.push(
      `${rapidEvals.length} rapid evaluation(s) detected (< 5 minutes)`,
    );
  }

  const incompleteEvals = evaluations.filter((e) => e.status !== "COMPLETED");
  if (incompleteEvals.length > 0) {
    flags.push(`${incompleteEvals.length} incomplete evaluation(s)`);
  }

  return flags;
}

function determineUrgencyLevel(
  evaluations: EvaluationInfo[],
  status: string,
): "low" | "medium" | "high" {
  if (status === "UNDER_REVIEW" && evaluations.length === 0) return "high";
  if (
    status === "UNDER_REVIEW" &&
    evaluations.filter((e) => e.status === "COMPLETED").length < 2
  )
    return "medium";
  return "low";
}

function getNextRecommendedActions(
  evaluations: EvaluationInfo[],
  status: string,
  consensus: ConsensusInfo | null,
): string[] {
  const actions: string[] = [];

  if (evaluations.length === 0) {
    actions.push("Assign initial reviewers");
  } else if (evaluations.filter((e) => e.status === "COMPLETED").length < 2) {
    actions.push("Assign additional reviewers for cross-validation");
  } else if (!consensus && status === "UNDER_REVIEW") {
    actions.push("Review for consensus decision");
  }

  const scores = evaluations
    .map((e) => e.overallScore)
    .filter((score): score is number => score !== null);
  if (scores.length > 1 && Math.sqrt(calculateVariance(scores)) > 15) {
    actions.push("Resolve scoring discrepancies between reviewers");
  }

  return actions;
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
