import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;

  try {
    // Get all applications for the event with demographics
    const allApplications = await db.application.findMany({
      where: {
        eventId,
        status: {
          in: [
            "SUBMITTED",
            "UNDER_REVIEW",
            "ACCEPTED",
            "REJECTED",
            "WAITLISTED",
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
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

    // Calculate overall acceptance rates
    const totalApplications = allApplications.length;
    const acceptedApplications = allApplications.filter(
      (app) => app.status === "ACCEPTED",
    );
    const rejectedApplications = allApplications.filter(
      (app) => app.status === "REJECTED",
    );
    const waitlistedApplications = allApplications.filter(
      (app) => app.status === "WAITLISTED",
    );
    const underReviewApplications = allApplications.filter(
      (app) => app.status === "UNDER_REVIEW",
    );

    const overallRates = {
      total: totalApplications,
      accepted: acceptedApplications.length,
      rejected: rejectedApplications.length,
      waitlisted: waitlistedApplications.length,
      underReview: underReviewApplications.length,
      acceptanceRate:
        totalApplications > 0
          ? (acceptedApplications.length / totalApplications) * 100
          : 0,
      rejectionRate:
        totalApplications > 0
          ? (rejectedApplications.length / totalApplications) * 100
          : 0,
    };

    // Calculate acceptance rates by company
    const companyRates = {} as Record<
      string,
      {
        total: number;
        accepted: number;
        rejected: number;
        acceptanceRate: number;
      }
    >;

    allApplications
      .filter((app) => app.user?.profile?.company)
      .forEach((app) => {
        const company = app.user!.profile!.company!;
        companyRates[company] ??= {
          total: 0,
          accepted: 0,
          rejected: 0,
          acceptanceRate: 0,
        };
        companyRates[company].total++;
        if (app.status === "ACCEPTED") companyRates[company].accepted++;
        if (app.status === "REJECTED") companyRates[company].rejected++;
      });

    // Calculate acceptance rates for companies
    Object.keys(companyRates).forEach((company) => {
      const data = companyRates[company];
      if (data) {
        data.acceptanceRate =
          data.total > 0 ? (data.accepted / data.total) * 100 : 0;
      }
    });

    // Calculate acceptance rates by job title
    const jobTitleRates = {} as Record<
      string,
      {
        total: number;
        accepted: number;
        rejected: number;
        acceptanceRate: number;
      }
    >;

    allApplications
      .filter((app) => app.user?.profile?.jobTitle)
      .forEach((app) => {
        const jobTitle = app.user!.profile!.jobTitle!;
        jobTitleRates[jobTitle] ??= {
          total: 0,
          accepted: 0,
          rejected: 0,
          acceptanceRate: 0,
        };
        jobTitleRates[jobTitle].total++;
        if (app.status === "ACCEPTED") jobTitleRates[jobTitle].accepted++;
        if (app.status === "REJECTED") jobTitleRates[jobTitle].rejected++;
      });

    // Calculate acceptance rates for job titles
    Object.keys(jobTitleRates).forEach((jobTitle) => {
      const data = jobTitleRates[jobTitle];
      if (data) {
        data.acceptanceRate =
          data.total > 0 ? (data.accepted / data.total) * 100 : 0;
      }
    });

    // Calculate acceptance rates by location
    const locationRates = {} as Record<
      string,
      {
        total: number;
        accepted: number;
        rejected: number;
        acceptanceRate: number;
      }
    >;

    allApplications
      .filter((app) => app.user?.profile?.location)
      .forEach((app) => {
        const location = app.user!.profile!.location!;
        locationRates[location] ??= {
          total: 0,
          accepted: 0,
          rejected: 0,
          acceptanceRate: 0,
        };
        locationRates[location].total++;
        if (app.status === "ACCEPTED") locationRates[location].accepted++;
        if (app.status === "REJECTED") locationRates[location].rejected++;
      });

    // Calculate acceptance rates for locations
    Object.keys(locationRates).forEach((location) => {
      const data = locationRates[location];
      if (data) {
        data.acceptanceRate =
          data.total > 0 ? (data.accepted / data.total) * 100 : 0;
      }
    });

    // Calculate acceptance rates by social presence
    const socialPresenceRates = {
      hasLinkedIn: {
        total: allApplications.filter((app) => app.user?.profile?.linkedinUrl)
          .length,
        accepted: acceptedApplications.filter(
          (app) => app.user?.profile?.linkedinUrl,
        ).length,
        acceptanceRate: 0,
      },
      hasGitHub: {
        total: allApplications.filter((app) => app.user?.profile?.githubUrl)
          .length,
        accepted: acceptedApplications.filter(
          (app) => app.user?.profile?.githubUrl,
        ).length,
        acceptanceRate: 0,
      },
      hasWebsite: {
        total: allApplications.filter((app) => app.user?.profile?.website)
          .length,
        accepted: acceptedApplications.filter(
          (app) => app.user?.profile?.website,
        ).length,
        acceptanceRate: 0,
      },
      hasProfilePicture: {
        total: allApplications.filter((app) => app.user?.image).length,
        accepted: acceptedApplications.filter((app) => app.user?.image).length,
        acceptanceRate: 0,
      },
    };

    // Calculate acceptance rates for social presence
    Object.keys(socialPresenceRates).forEach((key) => {
      const data = socialPresenceRates[key as keyof typeof socialPresenceRates];
      data.acceptanceRate =
        data.total > 0 ? (data.accepted / data.total) * 100 : 0;
    });

    // Analyze response patterns that correlate with acceptance
    const responseCorrelations = {} as Record<
      string,
      Record<
        string,
        {
          total: number;
          accepted: number;
          acceptanceRate: number;
        }
      >
    >;

    // Find demographic/background questions
    const demographicQuestions =
      allApplications[0]?.responses.filter(
        (r) =>
          r.question.questionKey?.includes("background") ||
          r.question.questionKey?.includes("experience") ||
          r.question.questionKey?.includes("expertise") ||
          r.question.questionKey?.includes("skills") ||
          r.question.questionKey?.includes("industry") ||
          r.question.questionKey?.includes("role"),
      ) ?? [];

    demographicQuestions.forEach((response) => {
      const questionKey = response.question.questionKey;
      if (
        !questionKey ||
        (response.question.questionType !== "SELECT" &&
          response.question.questionType !== "MULTISELECT")
      )
        return;

      responseCorrelations[questionKey] = {};

      allApplications.forEach((app) => {
        const appResponse = app.responses.find(
          (r) => r.question.questionKey === questionKey,
        );
        if (!appResponse) return;

        const answers = Array.isArray(appResponse.answer)
          ? appResponse.answer
          : appResponse.answer
            ? [appResponse.answer]
            : [];

        answers.forEach((answer) => {
          if (typeof answer === "string") {
            if (responseCorrelations[questionKey]) {
              responseCorrelations[questionKey][answer] ??= {
                total: 0,
                accepted: 0,
                acceptanceRate: 0,
              };
              responseCorrelations[questionKey][answer].total++;
              if (app.status === "ACCEPTED") {
                responseCorrelations[questionKey][answer].accepted++;
              }
            }
          }
        });
      });

      // Calculate acceptance rates for each response option
      if (responseCorrelations[questionKey]) {
        Object.keys(responseCorrelations[questionKey]).forEach((answer) => {
          const data = responseCorrelations[questionKey]![answer];
          if (data) {
            data.acceptanceRate =
              data.total > 0 ? (data.accepted / data.total) * 100 : 0;
          }
        });
      }
    });
    // Get event context
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        type: true,
      },
    });

    const analytics = {
      overall: overallRates,
      byCompany: companyRates,
      byJobTitle: jobTitleRates,
      byLocation: locationRates,
      bySocialPresence: socialPresenceRates,
      byResponsePattern: responseCorrelations,

      // Bias detection insights
      biasInsights: {
        companyBiasRisk: Object.values(companyRates).some(
          (rate) =>
            rate.acceptanceRate > overallRates.acceptanceRate * 1.5 ||
            rate.acceptanceRate < overallRates.acceptanceRate * 0.5,
        ),
        locationBiasRisk: Object.values(locationRates).some(
          (rate) =>
            rate.acceptanceRate > overallRates.acceptanceRate * 1.5 ||
            rate.acceptanceRate < overallRates.acceptanceRate * 0.5,
        ),
        socialPresenceBiasRisk: Object.values(socialPresenceRates).some(
          (rate) => rate.acceptanceRate > overallRates.acceptanceRate * 1.2,
        ),
        significantVariations: {
          companies: Object.entries(companyRates)
            .filter(([_, data]) => data.total >= 3) // Only consider companies with meaningful sample size
            .filter(
              ([_, data]) =>
                Math.abs(data.acceptanceRate - overallRates.acceptanceRate) >
                20,
            )
            .map(([company, data]) => ({ company, ...data })),
        },
      },
    };

    return Response.json({
      success: true,
      data: {
        eventId,
        event,
        analytics,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose:
            "Historical acceptance patterns for AI bias detection and calibration",
          totalApplications,
          sampleSize: totalApplications,
          confidenceNote:
            totalApplications < 50
              ? "Small sample size - patterns may not be statistically significant"
              : "Adequate sample size for pattern analysis",
          biasWarning:
            "Use these patterns carefully to train AI reviewers without perpetuating historical biases",
        },
      },
    });
  } catch (error) {
    console.error("[MASTRA API] Error calculating acceptance rates:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to calculate acceptance rates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
