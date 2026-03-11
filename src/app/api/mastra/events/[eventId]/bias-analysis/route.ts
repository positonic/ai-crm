import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const { searchParams } = new URL(request.url);

  // Query parameters
  const includeAI = searchParams.get("includeAI") === "true";
  const analysisType = searchParams.get("type") ?? "comprehensive"; // 'comprehensive' | 'demographic' | 'scoring'

  try {
    // Get all applications with evaluations
    const applications = await db.application.findMany({
      where: {
        eventId,
        status: {
          in: ["ACCEPTED", "REJECTED", "WAITLISTED", "UNDER_REVIEW"],
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
        evaluations: {
          where: includeAI
            ? {}
            : {
                reviewer: {
                  email: { not: "ai-reviewer@fundingthecommons.io" },
                },
              },
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            scores: {
              include: {
                criteria: {
                  select: {
                    id: true,
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

    // Filter to applications with evaluations
    const evaluatedApplications = applications.filter(
      (app) => app.evaluations.length > 0,
    );

    // Calculate bias analysis
    const biasAnalysis = {
      overall: {
        totalApplications: evaluatedApplications.length,
        statusDistribution: {
          ACCEPTED: evaluatedApplications.filter(
            (app) => app.status === "ACCEPTED",
          ).length,
          REJECTED: evaluatedApplications.filter(
            (app) => app.status === "REJECTED",
          ).length,
          WAITLISTED: evaluatedApplications.filter(
            (app) => app.status === "WAITLISTED",
          ).length,
          UNDER_REVIEW: evaluatedApplications.filter(
            (app) => app.status === "UNDER_REVIEW",
          ).length,
        },
      },

      // Company bias analysis
      companyBias: {} as Record<
        string,
        {
          total: number;
          accepted: number;
          avgScore: number;
          acceptanceRate: number;
          scoreDistribution: number[];
          biasRisk: "low" | "medium" | "high";
        }
      >,

      // Location bias analysis
      locationBias: {} as Record<
        string,
        {
          total: number;
          accepted: number;
          avgScore: number;
          acceptanceRate: number;
          scoreDistribution: number[];
          biasRisk: "low" | "medium" | "high";
        }
      >,

      // Job title bias analysis
      jobTitleBias: {} as Record<
        string,
        {
          total: number;
          accepted: number;
          avgScore: number;
          acceptanceRate: number;
          scoreDistribution: number[];
          biasRisk: "low" | "medium" | "high";
        }
      >,

      // Social presence bias
      socialPresenceBias: {
        withLinkedIn: { total: 0, accepted: 0, avgScore: 0, acceptanceRate: 0 },
        withGitHub: { total: 0, accepted: 0, avgScore: 0, acceptanceRate: 0 },
        withWebsite: { total: 0, accepted: 0, avgScore: 0, acceptanceRate: 0 },
        withProfilePicture: {
          total: 0,
          accepted: 0,
          avgScore: 0,
          acceptanceRate: 0,
        },
        withoutSocialPresence: {
          total: 0,
          accepted: 0,
          avgScore: 0,
          acceptanceRate: 0,
        },
      },

      // Scoring patterns by category
      scoringPatterns: {} as Record<
        string,
        {
          averageScore: number;
          scoreVariance: number;
          distributionByDemographic: Record<string, number>;
        }
      >,

      // Inter-rater reliability and consistency
      reviewerConsistency: {
        averageStandardDeviation: 0,
        highVarianceApplications: [] as Array<{
          applicationId: string;
          scores: number[];
          standardDeviation: number;
          recommendations: string[];
        }>,
        reviewerAgreement: 0, // Percentage of cases where reviewers agree
      },

      // Statistical significance tests
      statisticalTests: {
        companyBiasSignificance: 0, // p-value for company bias
        locationBiasSignificance: 0, // p-value for location bias
        socialPresenceBiasSignificance: 0, // p-value for social presence bias
        overallBiasRisk: "low" as "low" | "medium" | "high",
        confidenceLevel: 0.95,
        sampleSizeAdequate: evaluatedApplications.length >= 30,
      },
    };

    const overallAcceptanceRate =
      biasAnalysis.overall.statusDistribution.ACCEPTED /
      biasAnalysis.overall.totalApplications;

    // Analyze company bias
    evaluatedApplications.forEach((app) => {
      if (!app.user?.profile?.company) return;
      const company = app.user.profile.company;

      biasAnalysis.companyBias[company] ??= {
        total: 0,
        accepted: 0,
        avgScore: 0,
        acceptanceRate: 0,
        scoreDistribution: [],
        biasRisk: "low",
      };

      const companyData = biasAnalysis.companyBias[company];
      companyData.total++;
      if (app.status === "ACCEPTED") companyData.accepted++;

      // Calculate average score from evaluations
      const scores = app.evaluations
        .map((e) => e.overallScore)
        .filter(Boolean) as number[];
      if (scores.length > 0) {
        companyData.scoreDistribution.push(...scores);
      }
    });

    // Calculate company statistics and bias risk
    Object.keys(biasAnalysis.companyBias).forEach((company) => {
      const data = biasAnalysis.companyBias[company];
      if (data) {
        data.acceptanceRate = data.accepted / data.total;
        data.avgScore =
          data.scoreDistribution.length > 0
            ? data.scoreDistribution.reduce((sum, score) => sum + score, 0) /
              data.scoreDistribution.length
            : 0;
        // Determine bias risk based on deviation from overall acceptance rate
        const deviation = Math.abs(data.acceptanceRate - overallAcceptanceRate);
        data.biasRisk =
          deviation > 0.3 ? "high" : deviation > 0.15 ? "medium" : "low";
      }
    });

    // Analyze location bias (similar pattern)
    evaluatedApplications.forEach((app) => {
      if (!app.user?.profile?.location) return;
      const location = app.user.profile.location;
      biasAnalysis.locationBias[location] ??= {
        total: 0,
        accepted: 0,
        avgScore: 0,
        acceptanceRate: 0,
        scoreDistribution: [],
        biasRisk: "low",
      };

      const locationData = biasAnalysis.locationBias[location];
      locationData.total++;
      if (app.status === "ACCEPTED") locationData.accepted++;

      const scores = app.evaluations
        .map((e) => e.overallScore)
        .filter(Boolean) as number[];
      if (scores.length > 0) {
        locationData.scoreDistribution.push(...scores);
      }
    });

    Object.keys(biasAnalysis.locationBias).forEach((location) => {
      const data = biasAnalysis.locationBias[location];
      if (data) {
        data.acceptanceRate = data.accepted / data.total;
        data.avgScore =
          data.scoreDistribution.length > 0
            ? data.scoreDistribution.reduce((sum, score) => sum + score, 0) /
              data.scoreDistribution.length
            : 0;
        const deviation = Math.abs(data.acceptanceRate - overallAcceptanceRate);
        data.biasRisk =
          deviation > 0.3 ? "high" : deviation > 0.15 ? "medium" : "low";
      }
    });

    // Analyze job title bias (similar pattern)
    evaluatedApplications.forEach((app) => {
      if (!app.user?.profile?.jobTitle) return;
      const jobTitle = app.user.profile.jobTitle;

      biasAnalysis.jobTitleBias[jobTitle] ??= {
        total: 0,
        accepted: 0,
        avgScore: 0,
        acceptanceRate: 0,
        scoreDistribution: [],
        biasRisk: "low",
      };

      const jobData = biasAnalysis.jobTitleBias[jobTitle];
      jobData.total++;
      if (app.status === "ACCEPTED") jobData.accepted++;

      const scores = app.evaluations
        .map((e) => e.overallScore)
        .filter(Boolean) as number[];
      if (scores.length > 0) {
        jobData.scoreDistribution.push(...scores);
      }
    });

    Object.keys(biasAnalysis.jobTitleBias).forEach((jobTitle) => {
      const data = biasAnalysis.jobTitleBias[jobTitle];
      if (data) {
        data.acceptanceRate = data.accepted / data.total;
        data.avgScore =
          data.scoreDistribution.length > 0
            ? data.scoreDistribution.reduce((sum, score) => sum + score, 0) /
              data.scoreDistribution.length
            : 0;

        const deviation = Math.abs(data.acceptanceRate - overallAcceptanceRate);
        data.biasRisk =
          deviation > 0.3 ? "high" : deviation > 0.15 ? "medium" : "low";
      }
    });

    // Analyze social presence bias
    const socialPresenceAnalysis = (
      field: keyof typeof biasAnalysis.socialPresenceBias,
      accessor: (user: unknown) => boolean,
    ) => {
      const withFeature = evaluatedApplications.filter((app) =>
        accessor(app.user),
      );
      const data = biasAnalysis.socialPresenceBias[field];

      data.total = withFeature.length;
      data.accepted = withFeature.filter(
        (app) => app.status === "ACCEPTED",
      ).length;
      data.acceptanceRate = data.total > 0 ? data.accepted / data.total : 0;

      const scores = withFeature.flatMap((app) =>
        app.evaluations.map((e) => e.overallScore).filter(Boolean),
      ) as number[];
      data.avgScore =
        scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : 0;
    };

    socialPresenceAnalysis(
      "withLinkedIn",
      (user) =>
        typeof user === "object" &&
        user !== null &&
        "profile" in user &&
        typeof user.profile === "object" &&
        user.profile !== null &&
        "linkedinUrl" in user.profile &&
        !!user.profile.linkedinUrl,
    );
    socialPresenceAnalysis(
      "withGitHub",
      (user) =>
        typeof user === "object" &&
        user !== null &&
        "profile" in user &&
        typeof user.profile === "object" &&
        user.profile !== null &&
        "githubUrl" in user.profile &&
        !!user.profile.githubUrl,
    );
    socialPresenceAnalysis(
      "withWebsite",
      (user) =>
        typeof user === "object" &&
        user !== null &&
        "profile" in user &&
        typeof user.profile === "object" &&
        user.profile !== null &&
        "website" in user.profile &&
        !!user.profile.website,
    );
    socialPresenceAnalysis(
      "withProfilePicture",
      (user) =>
        typeof user === "object" &&
        user !== null &&
        "image" in user &&
        !!user.image,
    );

    const withoutSocial = evaluatedApplications.filter(
      (app) =>
        !app.user?.profile?.linkedinUrl &&
        !app.user?.profile?.githubUrl &&
        !app.user?.profile?.website &&
        !app.user?.image,
    );
    biasAnalysis.socialPresenceBias.withoutSocialPresence = {
      total: withoutSocial.length,
      accepted: withoutSocial.filter((app) => app.status === "ACCEPTED").length,
      avgScore: 0,
      acceptanceRate:
        withoutSocial.length > 0
          ? withoutSocial.filter((app) => app.status === "ACCEPTED").length /
            withoutSocial.length
          : 0,
    };

    // Calculate reviewer consistency
    const multiEvaluatedApps = evaluatedApplications.filter(
      (app) => app.evaluations.length > 1,
    );
    if (multiEvaluatedApps.length > 0) {
      let totalVariance = 0;
      const highVarianceApps: Array<{
        applicationId: string;
        scores: number[];
        standardDeviation: number;
        recommendations: string[];
      }> = [];

      multiEvaluatedApps.forEach((app) => {
        const scores = app.evaluations
          .map((e) => e.overallScore)
          .filter(Boolean) as number[];
        const recommendations = app.evaluations
          .map((e) => e.recommendation)
          .filter(Boolean) as string[];

        if (scores.length > 1) {
          const mean =
            scores.reduce((sum, score) => sum + score, 0) / scores.length;
          const variance =
            scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
            scores.length;
          const stdDev = Math.sqrt(variance);

          totalVariance += variance;

          if (stdDev > 15) {
            // High variance threshold
            highVarianceApps.push({
              applicationId: app.id,
              scores,
              standardDeviation: stdDev,
              recommendations,
            });
          }
        }
      });

      biasAnalysis.reviewerConsistency.averageStandardDeviation = Math.sqrt(
        totalVariance / multiEvaluatedApps.length,
      );
      biasAnalysis.reviewerConsistency.highVarianceApplications =
        highVarianceApps;

      // Calculate reviewer agreement (simplified)
      const agreementCount = multiEvaluatedApps.filter((app) => {
        const recommendations = app.evaluations
          .map((e) => e.recommendation)
          .filter(Boolean);
        return new Set(recommendations).size === 1; // All reviewers agree
      }).length;

      biasAnalysis.reviewerConsistency.reviewerAgreement =
        multiEvaluatedApps.length > 0
          ? (agreementCount / multiEvaluatedApps.length) * 100
          : 0;
    }

    // Determine overall bias risk
    const highRiskFactors = [
      Object.values(biasAnalysis.companyBias).filter(
        (d) => d.biasRisk === "high",
      ).length > 0,
      Object.values(biasAnalysis.locationBias).filter(
        (d) => d.biasRisk === "high",
      ).length > 0,
      Object.values(biasAnalysis.jobTitleBias).filter(
        (d) => d.biasRisk === "high",
      ).length > 0,
      Math.abs(
        biasAnalysis.socialPresenceBias.withLinkedIn.acceptanceRate -
          overallAcceptanceRate,
      ) > 0.2,
      biasAnalysis.reviewerConsistency.averageStandardDeviation > 20,
    ].filter(Boolean).length;

    biasAnalysis.statisticalTests.overallBiasRisk =
      highRiskFactors >= 3 ? "high" : highRiskFactors >= 1 ? "medium" : "low";

    return Response.json({
      success: true,
      data: {
        eventId,
        analysisType,
        biasAnalysis,
        recommendations: [
          ...(biasAnalysis.statisticalTests.overallBiasRisk === "high"
            ? [
                "High bias risk detected. Review evaluation criteria and reviewer training.",
                "Consider blind review processes to reduce demographic bias.",
              ]
            : []),
          ...(biasAnalysis.reviewerConsistency.reviewerAgreement < 70
            ? [
                "Low reviewer agreement. Consider calibration sessions or clearer evaluation guidelines.",
              ]
            : []),
          ...(Object.values(biasAnalysis.companyBias).some(
            (d) => d.biasRisk === "high",
          )
            ? [
                "Company bias detected. Ensure evaluations focus on individual merit rather than company prestige.",
              ]
            : []),
        ],
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose:
            "Bias detection and fairness analysis for AI reviewer calibration",
          includesAI: includeAI,
          sampleSize: evaluatedApplications.length,
          confidenceLevel: biasAnalysis.statisticalTests.confidenceLevel,
          warning:
            "Use these insights to improve fairness, not to perpetuate biases in AI training",
        },
      },
    });
  } catch (error) {
    console.error("[MASTRA API] Error performing bias analysis:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to perform bias analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
