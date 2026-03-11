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
interface QuestionInfo {
  questionKey: string | null;
  questionEn: string;
  questionType: string;
}

interface ResponseInfo {
  answer: unknown;
  question: QuestionInfo;
}

interface CriteriaInfo {
  name: string;
  category: string;
  weight: number;
}

interface ScoreInfo {
  score: number;
  criteria: CriteriaInfo;
}

interface ReviewerInfo {
  id: string;
  name: string | null;
}

interface EvaluationInfo {
  id: string;
  status: string;
  stage: string;
  overallScore: number | null;
  recommendation: string | null;
  overallComments: string | null;
  confidence: number | null;
  completedAt: Date | null;
  reviewer: ReviewerInfo;
  scores: ScoreInfo[];
}

interface ApplicationData {
  id: string;
  user: UserProfile | null;
  responses: ResponseInfo[];
  evaluations: EvaluationInfo[];
}

interface EventInfo {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  type: string;
}

async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;

  try {
    // Get all rejected applications with user demographics and evaluation details
    const rejectedApplications = await db.application.findMany({
      where: {
        eventId,
        status: "REJECTED",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            // Demographics fields from user profile
          },
          include: {
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
        responses: {
          include: {
            question: {
              select: {
                questionKey: true,
                questionEn: true,
                questionType: true,
              },
            },
          },
        },
        // Include evaluation details for rejection analysis
        evaluations: {
          select: {
            id: true,
            status: true,
            stage: true,
            overallScore: true,
            recommendation: true,
            overallComments: true,
            confidence: true,
            completedAt: true,
            reviewer: {
              select: {
                id: true,
                name: true,
              },
            },
            scores: {
              select: {
                score: true,
                criteria: {
                  select: {
                    name: true,
                    category: true,
                    weight: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const typedRejectedApplications = rejectedApplications as ApplicationData[];

    // Extract demographic insights with rejection analysis
    const demographics = {
      totalRejected: typedRejectedApplications.length,

      // Rejection analysis
      rejectionAnalysis: {
        averageScore: (() => {
          const validScores = typedRejectedApplications
            .flatMap((app) => app.evaluations)
            .map((evaluation) => evaluation.overallScore)
            .filter((score): score is number => score !== null);
          return validScores.length > 0
            ? validScores.reduce((sum, score) => sum + score, 0) /
                validScores.length
            : null;
        })(),

        commonRejectionReasons: typedRejectedApplications
          .flatMap((app) => app.evaluations)
          .map((evaluation) => evaluation.overallComments)
          .filter((comment): comment is string => comment !== null)
          .slice(0, 10), // Sample of rejection reasons for pattern analysis

        rejectionByStage: typedRejectedApplications
          .flatMap((app) => app.evaluations)
          .reduce(
            (acc, evaluation) => {
              acc[evaluation.stage] = (acc[evaluation.stage] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),

        categoryScores: {} as Record<string, number>,
      },

      // Company distribution
      companies: typedRejectedApplications
        .map((app) => app.user?.profile?.company)
        .filter((company): company is string => company !== null)
        .reduce(
          (acc, company) => {
            acc[company] = (acc[company] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),

      // Job title patterns
      jobTitles: typedRejectedApplications
        .map((app) => app.user?.profile?.jobTitle)
        .filter((title): title is string => title !== null)
        .reduce(
          (acc, title) => {
            acc[title] = (acc[title] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),

      // Geographic distribution
      locations: typedRejectedApplications
        .map((app) => app.user?.profile?.location)
        .filter((location): location is string => location !== null)
        .reduce(
          (acc, location) => {
            acc[location] = (acc[location] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),

      // Social presence indicators
      socialPresence: {
        hasLinkedIn: typedRejectedApplications.filter(
          (app) => app.user?.profile?.linkedinUrl,
        ).length,
        hasGitHub: typedRejectedApplications.filter(
          (app) => app.user?.profile?.githubUrl,
        ).length,
        hasWebsite: typedRejectedApplications.filter(
          (app) => app.user?.profile?.website,
        ).length,
        hasTwitter: typedRejectedApplications.filter(
          (app) => app.user?.profile?.twitterUrl,
        ).length,
        hasProfilePicture: typedRejectedApplications.filter(
          (app) => app.user?.image,
        ).length,
      },

      // Application response patterns
      responsePatterns: {} as Record<string, Record<string, number>>,
    };

    // Calculate category-specific scores for rejection patterns
    const categoryScoresMap: Record<string, number[]> = {};

    typedRejectedApplications.forEach((app) => {
      app.evaluations.forEach((evaluation) => {
        evaluation.scores.forEach((score) => {
          const category = score.criteria.category;
          categoryScoresMap[category] ??= [];
          categoryScoresMap[category].push(score.score);
        });
      });
    });

    // Calculate averages for category scores
    const categoryAverages = Object.entries(categoryScoresMap).reduce(
      (acc, [category, scores]) => {
        acc[category] =
          scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    demographics.rejectionAnalysis.categoryScores = categoryAverages;

    // Analyze response patterns for key demographic questions
    const sampleResponses =
      typedRejectedApplications[0]?.responses.filter(
        (r) =>
          r.question.questionKey?.includes("background") ??
          r.question.questionKey?.includes("experience") ??
          r.question.questionKey?.includes("expertise") ??
          r.question.questionKey?.includes("skills"),
      ) ?? [];

    sampleResponses.forEach((response) => {
      const questionKey = response.question.questionKey;
      if (!questionKey) return;

      demographics.responsePatterns[questionKey] ??= {};

      // Count responses across all rejected applications
      typedRejectedApplications.forEach((app) => {
        const appResponse = app.responses.find(
          (r) => r.question.questionKey === questionKey,
        );
        if (!appResponse) return;

        if (
          response.question.questionType === "SELECT" ||
          response.question.questionType === "MULTISELECT"
        ) {
          const answers = Array.isArray(appResponse.answer)
            ? (appResponse.answer as unknown[])
            : appResponse.answer
              ? [appResponse.answer]
              : [];

          answers.forEach((answer) => {
            if (typeof answer === "string") {
              const currentPatterns =
                demographics.responsePatterns[questionKey];
              if (currentPatterns) {
                currentPatterns[answer] = (currentPatterns[answer] ?? 0) + 1;
              }
            }
          });
        }
      });
    });

    // Get event context
    const event = (await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        type: true,
      },
    })) as EventInfo | null;

    return Response.json({
      success: true,
      data: {
        eventId,
        event,
        demographics,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose:
            "Demographics analysis of rejected applications for AI bias detection and improvement",
          totalApplications: typedRejectedApplications.length,
          anonymized: true,
          includesRejectionAnalysis: true,
          warningNote:
            "Use rejection patterns carefully to avoid reinforcing biases in AI training",
        },
      },
    });
  } catch (error) {
    console.error("[MASTRA API] Error fetching rejected demographics:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to fetch rejected demographics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
