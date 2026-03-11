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

interface ApplicationData {
  id: string;
  user: UserProfile | null;
  responses: ResponseInfo[];
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
    // Get all under-review applications with user demographics
    const underReviewApplications = await db.application.findMany({
      where: {
        eventId,
        OR: [{ status: "UNDER_REVIEW" }, { status: "SUBMITTED" }],
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
      },
    });

    const typedUnderReviewApplications =
      underReviewApplications as ApplicationData[];

    // Extract demographic insights
    const demographics = {
      totalUnderReview: typedUnderReviewApplications.length,

      // Company distribution
      companies: typedUnderReviewApplications
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
      jobTitles: typedUnderReviewApplications
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
      locations: typedUnderReviewApplications
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
        hasLinkedIn: typedUnderReviewApplications.filter(
          (app) => app.user?.profile?.linkedinUrl,
        ).length,
        hasGitHub: typedUnderReviewApplications.filter(
          (app) => app.user?.profile?.githubUrl,
        ).length,
        hasWebsite: typedUnderReviewApplications.filter(
          (app) => app.user?.profile?.website,
        ).length,
        hasTwitter: typedUnderReviewApplications.filter(
          (app) => app.user?.profile?.twitterUrl,
        ).length,
        hasProfilePicture: typedUnderReviewApplications.filter(
          (app) => app.user?.image,
        ).length,
      },

      // Application response patterns
      responsePatterns: {} as Record<string, Record<string, number>>,
    };

    // Analyze response patterns for key demographic questions
    const sampleResponses =
      typedUnderReviewApplications[0]?.responses.filter(
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

      // Count responses across all under-review applications
      typedUnderReviewApplications.forEach((app) => {
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
            "Demographics analysis of applications currently under review",
          totalApplications: typedUnderReviewApplications.length,
          anonymized: true,
          usage:
            "Use this data to track current review pipeline demographics and identify potential bias patterns",
        },
      },
    });
  } catch (error) {
    console.error(
      "[MASTRA API] Error fetching under-review demographics:",
      error,
    );

    return Response.json(
      {
        success: false,
        error: "Failed to fetch under-review demographics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
