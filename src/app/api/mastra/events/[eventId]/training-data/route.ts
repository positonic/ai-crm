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
    location: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    website: string | null;
    twitterUrl: string | null;
  } | null;
  image?: string | null;
}
interface EventInfo {
  id: string;
  name: string;
  description: string | null;
  type: string;
}

interface QuestionInfo {
  id: string;
  questionKey: string | null;
  questionEn: string;
  questionType: string;
  required: boolean;
  options: unknown;
  order: number;
}

interface ResponseInfo {
  questionId: string;
  answer: unknown;
  question: QuestionInfo;
}

interface CriteriaInfo {
  id: string;
  name: string;
  description: string | null;
  category: string;
  weight: number;
  minScore: number;
  maxScore: number;
}

interface ScoreInfo {
  criteriaId: string;
  score: number;
  reasoning: string | null;
  criteria: CriteriaInfo;
}

interface CommentInfo {
  id: string;
  questionKey: string | null;
  comment: string;
  isPrivate: boolean;
}

interface ReviewerInfo {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
}

interface EvaluationInfo {
  id: string;
  reviewerId: string;
  stage: string;
  status: string;
  overallScore: number | null;
  confidence: number | null;
  recommendation: string | null;
  timeSpentMinutes: number | null;
  completedAt: Date | null;
  reviewer: ReviewerInfo;
  scores: ScoreInfo[];
  comments: CommentInfo[];
}

interface ApplicationData {
  id: string;
  userId: string;
  eventId: string;
  status: string;
  language: string | null;
  isComplete: boolean;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: UserProfile | null;
  event: EventInfo;
  responses: ResponseInfo[];
  evaluations: EvaluationInfo[];
}

async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const { searchParams } = new URL(request.url);

  // Query parameters for filtering training data
  const includeCompleted = searchParams.get("includeCompleted") !== "false";
  const includeInProgress = searchParams.get("includeInProgress") === "true";
  const minEvaluations = parseInt(searchParams.get("minEvaluations") ?? "1");
  const format = searchParams.get("format") ?? "detailed"; // 'detailed' | 'minimal' | 'ml-ready'

  try {
    // Get all applications with their evaluations for training
    const applications = await db.application.findMany({
      where: {
        eventId,
        status: {
          in: includeInProgress
            ? [
                "SUBMITTED",
                "UNDER_REVIEW",
                "ACCEPTED",
                "REJECTED",
                "WAITLISTED",
              ]
            : ["ACCEPTED", "REJECTED", "WAITLISTED"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                company: true,
                jobTitle: true,
                location: true,
                linkedinUrl: true,
                githubUrl: true,
                website: true,
                twitterUrl: true,
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
          },
        },
        responses: {
          include: {
            question: {
              select: {
                id: true,
                questionEn: true,
                required: true,
                questionKey: true,
                questionType: true,
                options: true,
                order: true,
              },
            },
          },
          orderBy: {
            question: { order: "asc" },
          },
        },
        evaluations: {
          where: includeCompleted ? { status: "COMPLETED" } : {},
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
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
                  },
                },
              },
            },
            comments: {
              select: {
                id: true,
                questionKey: true,
                comment: true,
                isPrivate: true,
              },
            },
          },
        },
      },
    });

    const trainingApplications = (applications as ApplicationData[]).filter(
      (app) => app.evaluations.length >= minEvaluations,
    );

    // Get evaluation criteria for reference
    const criteria = await db.evaluationCriteria.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    // Transform data based on requested format
    let transformedData: unknown;

    if (format === "ml-ready") {
      // Machine learning ready format with normalized features
      transformedData = trainingApplications.map((app) => ({
        applicationId: app.id,
        label: app.status === "ACCEPTED" ? 1 : 0, // Binary classification
        features: {
          // Application features
          responseCount: app.responses.length,
          completionPercentage: app.isComplete ? 100 : 0,
          submissionDelay: app.submittedAt
            ? Math.floor(
                (app.submittedAt.getTime() - app.createdAt.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : null,

          // User demographic features (anonymized)
          hasCompany: !!app.user?.profile?.company,
          hasJobTitle: !!app.user?.profile?.jobTitle,
          hasLocation: !!app.user?.profile?.location,
          hasLinkedIn: !!app.user?.profile?.linkedinUrl,
          hasGitHub: !!app.user?.profile?.githubUrl,
          hasWebsite: !!app.user?.profile?.website,

          // Response features (encoded)
          responses: app.responses.reduce(
            (acc, response) => {
              const key =
                response.question.questionKey ?? `q_${response.questionId}`;

              if (
                response.question.questionType === "SELECT" ||
                response.question.questionType === "MULTISELECT"
              ) {
                // One-hot encode categorical responses
                const options = response.question.options as string[] | null;
                if (options) {
                  options.forEach((option) => {
                    const answer = Array.isArray(response.answer)
                      ? (response.answer as unknown[])
                      : [response.answer];
                    acc[`${key}_${option.toLowerCase().replace(/\s+/g, "_")}`] =
                      answer.includes(option) ? 1 : 0;
                  });
                }
              } else if (response.question.questionType === "NUMBER") {
                acc[key] = parseFloat(response.answer as string) ?? 0;
              } else {
                // Text features - length and complexity metrics
                const text = (response.answer as string) ?? "";
                acc[`${key}_length`] = text.length;
                acc[`${key}_words`] = text.split(/\s+/).length;
                acc[`${key}_sentences`] = text.split(/[.!?]+/).length;
              }

              return acc;
            },
            {} as Record<string, number>,
          ),
        },

        // Human evaluation outcomes for training
        evaluationTargets: app.evaluations.map((evaluation) => ({
          overallScore: evaluation.overallScore,
          recommendation: evaluation.recommendation,
          confidence: evaluation.confidence,
          categoryScores: evaluation.scores.reduce(
            (acc, score) => {
              acc[score.criteria.category] = score.score;
              return acc;
            },
            {} as Record<string, number>,
          ),
        })),
      }));
    } else if (format === "minimal") {
      // Minimal format for quick analysis
      transformedData = trainingApplications.map((app) => ({
        id: app.id,
        status: app.status,
        submitted: app.submittedAt,
        evaluations: app.evaluations.map((evaluation) => ({
          score: evaluation.overallScore,
          recommendation: evaluation.recommendation,
          confidence: evaluation.confidence,
        })),
        responseCount: app.responses.length,
      }));
    } else {
      // Detailed format (default)
      transformedData = trainingApplications.map((app) => ({
        application: {
          id: app.id,
          userId: app.userId,
          status: app.status,
          language: app.language,
          isComplete: app.isComplete,
          submittedAt: app.submittedAt,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
        },

        // Anonymized applicant info
        applicant: {
          hasCompany: !!app.user?.profile?.company,
          hasJobTitle: !!app.user?.profile?.jobTitle,
          hasLocation: !!app.user?.profile?.location,
          hasSocialPresence: !!(
            app.user?.profile?.linkedinUrl ??
            app.user?.profile?.githubUrl ??
            app.user?.profile?.website
          ),
          profileCompleteness: [
            app.user?.profile?.company,
            app.user?.profile?.jobTitle,
            app.user?.profile?.location,
            app.user?.profile?.linkedinUrl,
            app.user?.profile?.githubUrl,
          ].filter(Boolean).length,
        },

        event: app.event,

        responses: app.responses.map((response) => ({
          questionId: response.questionId,
          questionKey: response.question.questionKey,
          questionText: response.question.questionEn,
          questionType: response.question.questionType,
          required: response.question.required,
          answer: response.answer,
          order: response.question.order,
          // Text analysis for training
          answerAnalysis:
            typeof response.answer === "string"
              ? {
                  length: response.answer.length,
                  wordCount: response.answer.split(/\s+/).length,
                  complexity: response.answer.split(/[.!?]+/).length,
                }
              : null,
        })),

        evaluations: app.evaluations.map((evaluation) => ({
          id: evaluation.id,
          reviewerId: evaluation.reviewerId,
          isAIReviewer:
            evaluation.reviewer.email === "ai-reviewer@fundingthecommons.io",
          stage: evaluation.stage,
          status: evaluation.status,
          overallScore: evaluation.overallScore,
          confidence: evaluation.confidence,
          recommendation: evaluation.recommendation,
          timeSpentMinutes: evaluation.timeSpentMinutes,
          completedAt: evaluation.completedAt,

          scores: evaluation.scores.map((score) => ({
            criteriaId: score.criteriaId,
            criteriaName: score.criteria.name,
            category: score.criteria.category,
            weight: score.criteria.weight,
            score: score.score,
            normalizedScore:
              (score.score - score.criteria.minScore) /
              (score.criteria.maxScore - score.criteria.minScore),
            reasoning: score.reasoning,
          })),

          comments: evaluation.comments
            .filter((c) => !c.isPrivate)
            .map((comment) => ({
              questionKey: comment.questionKey,
              comment: comment.comment,
            })),
        })),
      }));
    }

    // Generate training statistics
    const statistics = {
      totalApplications: trainingApplications.length,
      statusDistribution: {
        ACCEPTED: trainingApplications.filter(
          (app) => app.status === "ACCEPTED",
        ).length,
        REJECTED: trainingApplications.filter(
          (app) => app.status === "REJECTED",
        ).length,
        WAITLISTED: trainingApplications.filter(
          (app) => app.status === "WAITLISTED",
        ).length,
        UNDER_REVIEW: trainingApplications.filter(
          (app) => app.status === "UNDER_REVIEW",
        ).length,
      },
      evaluationStats: {
        totalEvaluations: trainingApplications.reduce(
          (sum, app) => sum + app.evaluations.length,
          0,
        ),
        averageEvaluationsPerApp:
          trainingApplications.length > 0
            ? trainingApplications.reduce(
                (sum, app) => sum + app.evaluations.length,
                0,
              ) / trainingApplications.length
            : 0,
        uniqueReviewers: new Set(
          trainingApplications.flatMap((app) =>
            app.evaluations.map((e) => e.reviewerId),
          ),
        ).size,
      },
      dataQuality: {
        completeApplications: trainingApplications.filter(
          (app) => app.isComplete,
        ).length,
        averageResponseCount:
          trainingApplications.length > 0
            ? trainingApplications.reduce(
                (sum, app) => sum + app.responses.length,
                0,
              ) / trainingApplications.length
            : 0,
      },
    };

    return Response.json({
      success: true,
      data: {
        eventId,
        format,
        applications: transformedData,
        criteria,
        statistics,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose: "Training data for AI reviewer model development",
          filters: {
            includeCompleted,
            includeInProgress,
            minEvaluations,
          },
          privacy: "Personal information has been anonymized or removed",
          usage:
            "Use this data to train, validate, and test AI reviewer models",
        },
      },
    });
  } catch (error) {
    console.error("[MASTRA API] Error generating training data:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to generate training data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
