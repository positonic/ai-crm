/**
 * Analytics Router - Secure, Anonymized Data Access
 *
 * Provides analytics endpoints for researchers like David Dao
 * with built-in PII protection, rate limiting, and audit logging.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  checkResearcherAccess,
  logAnalyticsAccess,
  checkRateLimit,
} from "~/utils/analyticsAuth";
import { sanitizeTextForAnalysis } from "~/utils/textSanitization";
import {
  generateParticipantId,
  generateEventContextId,
} from "~/utils/anonymization";

/**
 * Interface for experience level tracking
 */
interface ExperienceLevels {
  junior: number;
  mid: number;
  senior: number;
  unspecified: number;
}
/**
 * Minimum threshold for returning aggregated data
 * Groups with fewer than this many participants will not be returned
 */
const MIN_AGGREGATION_THRESHOLD = 5;

export const analyticsRouter = createTRPCRouter({
  /**
   * Get sanitized text corpus for Broad Listening analysis
   * Returns all text responses grouped by question type with PII removed
   */
  getApplicationTextCorpus: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        questionKeys: z.array(z.string()).optional(), // Specific questions to include
        includeMetadata: z.boolean().default(true),
        sanitizationLevel: z.enum(["standard", "strict"]).default("standard"),
      }),
    )
    .query(async ({ ctx, input }) => {
      checkResearcherAccess(ctx.session.user.role);

      // Rate limiting
      await checkRateLimit(
        ctx.db,
        ctx.session.user.id,
        "APPLICATION_TEXT_CORPUS",
      );

      // Get applications with responses
      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
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
            where: input.questionKeys
              ? {
                  question: {
                    questionKey: { in: input.questionKeys },
                  },
                }
              : undefined,
          },
        },
      });

      // Group responses by question type and sanitize
      const textCorpus: Record<
        string,
        Array<{
          text: string;
          originalLength: number;
          participantId: string;
        }>
      > = {};

      let totalResponses = 0;

      for (const application of applications) {
        const participantId = generateParticipantId(
          application.userId ?? application.id,
          input.eventId,
        );

        for (const response of application.responses) {
          const questionKey = response.question.questionKey;
          // Only include text-based responses
          if (!["TEXT", "TEXTAREA"].includes(response.question.questionType)) {
            continue;
          }

          textCorpus[questionKey] ??= [];

          // Sanitize the text
          const sanitizedText = sanitizeTextForAnalysis(response.answer, {
            preserveEmailStructure: false,
            preserveUrlStructure: false,
            preserveNameStructure: input.sanitizationLevel === "standard",
          });

          if (sanitizedText.trim().length > 0) {
            textCorpus[questionKey].push({
              text: sanitizedText,
              originalLength: response.answer.length,
              participantId,
            });
            totalResponses++;
          }
        }
      }

      // Filter out question types with too few responses
      const filteredCorpus: typeof textCorpus = {};
      for (const [questionKey, responses] of Object.entries(textCorpus)) {
        if (responses.length >= MIN_AGGREGATION_THRESHOLD) {
          filteredCorpus[questionKey] = responses;
        }
      }

      const result = {
        eventContext: generateEventContextId(input.eventId),
        questionTypes: filteredCorpus,
        metadata: input.includeMetadata
          ? {
              totalApplications: applications.length,
              totalResponses,
              questionCount: Object.keys(filteredCorpus).length,
              averageResponseLength: Math.round(
                Object.values(filteredCorpus)
                  .flat()
                  .reduce((sum, r) => sum + r.originalLength, 0) /
                  totalResponses || 0,
              ),
              sanitizationLevel: input.sanitizationLevel,
            }
          : undefined,
      };

      // Log access
      await logAnalyticsAccess(ctx.db, {
        userId: ctx.session.user.id,
        endpoint: "APPLICATION_TEXT_CORPUS",
        eventId: input.eventId,
        dataRequested: `${Object.keys(filteredCorpus).length} question types, ${totalResponses} responses`,
        requestParams: input,
        responseSize: JSON.stringify(result).length,
      });

      return result;
    }),

  /**
   * Get demographics breakdown for visualization
   * Returns aggregated gender/region/experience data
   */
  getDemographicsBreakdown: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        status: z
          .enum([
            "DRAFT",
            "SUBMITTED",
            "UNDER_REVIEW",
            "ACCEPTED",
            "REJECTED",
            "WAITLISTED",
            "CANCELLED",
          ])
          .optional(),
        applicationType: z.enum(["RESIDENT", "MENTOR", "SPEAKER"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      checkResearcherAccess(ctx.session.user.role);

      await checkRateLimit(
        ctx.db,
        ctx.session.user.id,
        "DEMOGRAPHICS_BREAKDOWN",
      );

      // Import demographics utilities
      const { isLatamCountry, normalizeGender, calculatePercentage } =
        await import("~/utils/demographics");

      // Get applications with responses
      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          ...(input.status && { status: input.status }),
          ...(input.applicationType && {
            applicationType: input.applicationType,
          }),
        },
        include: {
          responses: {
            include: {
              question: {
                select: {
                  questionKey: true,
                },
              },
            },
          },
        },
      });

      // Only proceed if we have enough data
      if (applications.length < MIN_AGGREGATION_THRESHOLD) {
        const result = {
          eventContext: generateEventContextId(input.eventId),
          totalParticipants: 0,
          message:
            "Insufficient data for demographics analysis (minimum 5 participants required)",
        };

        await logAnalyticsAccess(ctx.db, {
          userId: ctx.session.user.id,
          endpoint: "DEMOGRAPHICS_BREAKDOWN",
          eventId: input.eventId,
          dataRequested: "Demographics (insufficient data)",
          requestParams: input,
        });

        return result;
      }

      // Process demographic data
      let maleCount = 0;
      let femaleCount = 0;
      let otherGenderCount = 0;
      let preferNotToSayCount = 0;
      let unspecifiedGenderCount = 0;

      let latamCount = 0;
      let nonLatamCount = 0;
      let unspecifiedRegionCount = 0;

      // Experience level tracking
      const experienceLevels: ExperienceLevels = {
        junior: 0, // 0-2 years
        mid: 0, // 3-7 years
        senior: 0, // 8+ years
        unspecified: 0,
      };

      for (const application of applications) {
        const responseMap = new Map(
          application.responses.map((r) => [r.question.questionKey, r.answer]),
        );

        // Process gender data
        const genderResponse =
          responseMap.get("gender") ?? responseMap.get("sex") ?? "";
        const normalizedGender = normalizeGender(genderResponse);

        switch (normalizedGender) {
          case "male":
            maleCount++;
            break;
          case "female":
            femaleCount++;
            break;
          case "other":
            otherGenderCount++;
            break;
          case "prefer_not_to_say":
            preferNotToSayCount++;
            break;
          case "unspecified":
            unspecifiedGenderCount++;
            break;
        }

        // Process nationality/region data
        const nationalityResponse =
          responseMap.get("nationality") ?? responseMap.get("country") ?? "";

        if (!nationalityResponse) {
          unspecifiedRegionCount++;
        } else if (isLatamCountry(nationalityResponse)) {
          latamCount++;
        } else {
          nonLatamCount++;
        }

        // Process experience data
        const experienceResponse =
          responseMap.get("years_of_experience") ??
          responseMap.get("experience") ??
          "";
        const experienceYears = parseInt(experienceResponse);

        if (isNaN(experienceYears)) {
          experienceLevels.unspecified++;
        } else if (experienceYears <= 2) {
          experienceLevels.junior++;
        } else if (experienceYears <= 7) {
          experienceLevels.mid++;
        } else {
          experienceLevels.senior++;
        }
      }

      const total = applications.length;

      const result = {
        eventContext: generateEventContextId(input.eventId),
        totalParticipants: total,
        gender: {
          male: maleCount,
          female: femaleCount,
          other: otherGenderCount,
          prefer_not_to_say: preferNotToSayCount,
          unspecified: unspecifiedGenderCount,
          percentages: {
            male: calculatePercentage(maleCount, total),
            female: calculatePercentage(femaleCount, total),
            other: calculatePercentage(otherGenderCount, total),
            prefer_not_to_say: calculatePercentage(preferNotToSayCount, total),
            unspecified: calculatePercentage(unspecifiedGenderCount, total),
          },
        },
        region: {
          latam: latamCount,
          non_latam: nonLatamCount,
          unspecified: unspecifiedRegionCount,
          percentages: {
            latam: calculatePercentage(latamCount, total),
            non_latam: calculatePercentage(nonLatamCount, total),
            unspecified: calculatePercentage(unspecifiedRegionCount, total),
          },
        },
        experience: {
          ...experienceLevels,
          percentages: {
            junior: calculatePercentage(experienceLevels.junior, total),
            mid: calculatePercentage(experienceLevels.mid, total),
            senior: calculatePercentage(experienceLevels.senior, total),
            unspecified: calculatePercentage(
              experienceLevels.unspecified,
              total,
            ),
          },
        },
      };

      await logAnalyticsAccess(ctx.db, {
        userId: ctx.session.user.id,
        endpoint: "DEMOGRAPHICS_BREAKDOWN",
        eventId: input.eventId,
        dataRequested: `Demographics for ${total} participants`,
        requestParams: input,
        responseSize: JSON.stringify(result).length,
      });

      return result;
    }),

  /**
   * Get skills word cloud data
   * Returns skills frequency data for visualization
   */
  getSkillsWordCloud: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        minOccurrences: z.number().min(1).default(2),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      checkResearcherAccess(ctx.session.user.role);

      await checkRateLimit(ctx.db, ctx.session.user.id, "SKILLS_WORD_CLOUD");

      // Get applications with skills responses
      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
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
          responses: {
            include: {
              question: {
                select: {
                  questionKey: true,
                },
              },
            },
            where: {
              question: {
                questionKey: {
                  in: ["technical_skills", "skills", "expertise"],
                },
              },
            },
          },
        },
      });

      // Count skill occurrences
      const skillCounts: Record<string, number> = {};
      let totalParticipants = 0;

      for (const application of applications) {
        let hasSkills = false;

        for (const response of application.responses) {
          try {
            // Try to parse as JSON array (for technical_skills)
            const skills = JSON.parse(response.answer) as string[];
            if (Array.isArray(skills)) {
              hasSkills = true;
              for (const skill of skills) {
                const cleanSkill = skill.trim();
                if (cleanSkill) {
                  skillCounts[cleanSkill] = (skillCounts[cleanSkill] ?? 0) + 1;
                }
              }
            }
          } catch {
            // If not JSON, treat as comma-separated text
            const skills = response.answer
              .split(/[,\n]/)
              .map((s) => s.trim())
              .filter(Boolean);
            if (skills.length > 0) {
              hasSkills = true;
              for (const skill of skills) {
                skillCounts[skill] = (skillCounts[skill] ?? 0) + 1;
              }
            }
          }
        }

        if (hasSkills) {
          totalParticipants++;
        }
      }

      // Filter by minimum occurrences and sort by frequency
      const filteredSkills = Object.entries(skillCounts)
        .filter(([_, count]) => count >= input.minOccurrences)
        .sort(([, a], [, b]) => b - a)
        .slice(0, input.limit)
        .map(([skill, count]) => ({
          skill,
          count,
          percentage: Math.round((count / totalParticipants) * 100),
        }));

      const result = {
        eventContext: generateEventContextId(input.eventId),
        totalParticipants,
        totalUniqueSkills: Object.keys(skillCounts).length,
        skills: filteredSkills,
        metadata: {
          minOccurrences: input.minOccurrences,
          topSkillsShown: filteredSkills.length,
        },
      };

      await logAnalyticsAccess(ctx.db, {
        userId: ctx.session.user.id,
        endpoint: "SKILLS_WORD_CLOUD",
        eventId: input.eventId,
        dataRequested: `${filteredSkills.length} skills from ${totalParticipants} participants`,
        requestParams: input,
        responseSize: JSON.stringify(result).length,
      });

      return result;
    }),

  /**
   * Get application timeline data
   * Returns submission patterns over time
   */
  getApplicationTimeline: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        granularity: z.enum(["day", "week", "hour"]).default("day"),
        includeStatus: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      checkResearcherAccess(ctx.session.user.role);

      await checkRateLimit(ctx.db, ctx.session.user.id, "APPLICATION_TIMELINE");

      const applications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          submittedAt: { not: null },
        },
        select: {
          submittedAt: true,
          status: true,
          applicationType: true,
        },
        orderBy: {
          submittedAt: "asc",
        },
      });

      if (applications.length < MIN_AGGREGATION_THRESHOLD) {
        const result = {
          eventContext: generateEventContextId(input.eventId),
          timeline: [],
          message: "Insufficient data for timeline analysis",
        };

        await logAnalyticsAccess(ctx.db, {
          userId: ctx.session.user.id,
          endpoint: "APPLICATION_TIMELINE",
          eventId: input.eventId,
          dataRequested: "Timeline (insufficient data)",
          requestParams: input,
        });

        return result;
      }

      // Group submissions by time period
      const timeGroups: Record<
        string,
        {
          timestamp: string;
          count: number;
          statusBreakdown?: Record<string, number>;
          typeBreakdown?: Record<string, number>;
        }
      > = {};

      for (const app of applications) {
        if (!app.submittedAt) continue;

        let timeKey: string;
        if (input.granularity === "hour") {
          timeKey =
            app.submittedAt.toISOString().substring(0, 13) + ":00:00.000Z";
        } else if (input.granularity === "week") {
          const weekStart = new Date(app.submittedAt);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          timeKey = weekStart.toISOString().substring(0, 10) + "T00:00:00.000Z";
        } else {
          timeKey =
            app.submittedAt.toISOString().substring(0, 10) + "T00:00:00.000Z";
        }

        timeGroups[timeKey] ??= {
          timestamp: timeKey,
          count: 0,
          statusBreakdown: {},
          typeBreakdown: {},
        };
        timeGroups[timeKey]!.count++;

        if (input.includeStatus) {
          const timeGroup = timeGroups[timeKey]!;
          const statusBreakdown = timeGroup.statusBreakdown!;
          const typeBreakdown = timeGroup.typeBreakdown!;
          statusBreakdown[app.status] = (statusBreakdown[app.status] ?? 0) + 1;

          typeBreakdown[app.applicationType] =
            (typeBreakdown[app.applicationType] ?? 0) + 1;
        }
      }

      const timeline = Object.values(timeGroups).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Remove breakdowns if not requested
      if (!input.includeStatus) {
        timeline.forEach((item) => {
          delete item.statusBreakdown;
          delete item.typeBreakdown;
        });
      }

      const result = {
        eventContext: generateEventContextId(input.eventId),
        timeline,
        metadata: {
          totalSubmissions: applications.length,
          granularity: input.granularity,
          timeRange: {
            earliest: applications[0]?.submittedAt,
            latest: applications[applications.length - 1]?.submittedAt,
          },
        },
      };

      await logAnalyticsAccess(ctx.db, {
        userId: ctx.session.user.id,
        endpoint: "APPLICATION_TIMELINE",
        eventId: input.eventId,
        dataRequested: `Timeline with ${timeline.length} data points`,
        requestParams: input,
        responseSize: JSON.stringify(result).length,
      });

      return result;
    }),

  /**
   * Get review metrics and activity data
   * Returns aggregated review statistics without exposing individual reviewer data
   */
  getReviewMetrics: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        includeTimeline: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      checkResearcherAccess(ctx.session.user.role);

      await checkRateLimit(ctx.db, ctx.session.user.id, "REVIEW_METRICS");

      // Get evaluation data
      const evaluations = await ctx.db.applicationEvaluation.findMany({
        where: {
          application: {
            eventId: input.eventId,
          },
        },
        select: {
          overallScore: true,
          recommendation: true,
          timeSpentMinutes: true,
          stage: true,
          completedAt: true,
          confidence: true,
        },
      });

      const assignments = await ctx.db.reviewerAssignment.findMany({
        where: {
          application: {
            eventId: input.eventId,
          },
        },
        select: {
          stage: true,
          assignedAt: true,
          completedAt: true,
        },
      });

      if (evaluations.length < MIN_AGGREGATION_THRESHOLD) {
        const result = {
          eventContext: generateEventContextId(input.eventId),
          message: "Insufficient review data for analysis",
        };

        await logAnalyticsAccess(ctx.db, {
          userId: ctx.session.user.id,
          endpoint: "REVIEW_METRICS",
          eventId: input.eventId,
          dataRequested: "Review metrics (insufficient data)",
          requestParams: input,
        });

        return result;
      }

      // Calculate metrics
      const completedEvaluations = evaluations.filter((e) => e.completedAt);
      const totalTimeSpent = completedEvaluations
        .filter((e) => e.timeSpentMinutes)
        .reduce((sum, e) => sum + (e.timeSpentMinutes ?? 0), 0);

      const scoreDistribution = completedEvaluations
        .filter((e) => e.overallScore !== null)
        .reduce(
          (acc, e) => {
            const score = Math.floor(e.overallScore!);
            acc[score] = (acc[score] ?? 0) + 1;
            return acc;
          },
          {} as Record<number, number>,
        );

      const recommendationCounts = completedEvaluations
        .filter((e) => e.recommendation)
        .reduce(
          (acc, e) => {
            acc[e.recommendation!] = (acc[e.recommendation!] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

      const stageBreakdown = assignments.reduce(
        (acc, a) => {
          acc[a.stage] = (acc[a.stage] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      let timeline = undefined;
      if (input.includeTimeline && completedEvaluations.length > 0) {
        // Group by day
        const timelineData: Record<string, number> = {};
        completedEvaluations.forEach((e) => {
          if (e.completedAt) {
            const day = e.completedAt.toISOString().substring(0, 10);
            timelineData[day] = (timelineData[day] ?? 0) + 1;
          }
        });

        timeline = Object.entries(timelineData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, reviewsCompleted: count }));
      }

      const result = {
        eventContext: generateEventContextId(input.eventId),
        totalEvaluations: evaluations.length,
        completedEvaluations: completedEvaluations.length,
        averageTimePerReview:
          completedEvaluations.length > 0
            ? Math.round(totalTimeSpent / completedEvaluations.length)
            : 0,
        totalReviewHours: Math.round(totalTimeSpent / 60),
        scoreDistribution,
        recommendationBreakdown: recommendationCounts,
        stageBreakdown,
        averageConfidence:
          completedEvaluations.length > 0
            ? Math.round(
                (completedEvaluations
                  .filter((e) => e.confidence)
                  .reduce((sum, e) => sum + (e.confidence ?? 0), 0) /
                  completedEvaluations.filter((e) => e.confidence).length) *
                  10,
              ) / 10
            : null,
        timeline,
      };

      await logAnalyticsAccess(ctx.db, {
        userId: ctx.session.user.id,
        endpoint: "REVIEW_METRICS",
        eventId: input.eventId,
        dataRequested: `Review metrics for ${evaluations.length} evaluations`,
        requestParams: input,
        responseSize: JSON.stringify(result).length,
      });

      return result;
    }),
});
