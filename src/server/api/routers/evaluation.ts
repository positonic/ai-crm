import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getAIEvaluationService } from "~/server/services/aiEvaluation";

// Helper function to check if user has admin/staff role
function checkAdminAccess(userRole?: string | null) {
  if (!userRole || (userRole !== "admin" && userRole !== "staff")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or staff access required",
    });
  }
}

// Input validation schemas
const CreateReviewerAssignmentSchema = z.object({
  applicationId: z.string(),
  reviewerId: z.string(),
  stage: z.enum([
    "SCREENING",
    "DETAILED_REVIEW",
    "VIDEO_REVIEW",
    "CONSENSUS",
    "FINAL_DECISION",
  ]),
  priority: z.number().int().min(0).default(0),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
});

const BulkCreateAssignmentsSchema = z.object({
  applicationIds: z.array(z.string()).min(1),
  reviewerId: z.string(),
  stage: z
    .enum([
      "SCREENING",
      "DETAILED_REVIEW",
      "VIDEO_REVIEW",
      "CONSENSUS",
      "FINAL_DECISION",
    ])
    .default("SCREENING"),
  priority: z.number().int().min(0).default(0),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
});

const UpdateEvaluationSchema = z.object({
  evaluationId: z.string(),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REVIEWED"])
    .optional(),
  overallScore: z.number().min(0).max(10).optional(),
  overallComments: z.string().optional(),
  recommendation: z
    .enum(["ACCEPT", "REJECT", "WAITLIST", "NEEDS_MORE_INFO"])
    .optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  timeSpentMinutes: z.number().int().min(0).optional(),
  videoWatched: z.boolean().optional(),
  videoTimestamp: z.string().optional(), // JSON string
  videoQuality: z.number().int().min(1).max(5).optional(),
  completedAt: z.date().optional(),
});

const CreateEvaluationScoreSchema = z.object({
  evaluationId: z.string(),
  criteriaId: z.string(),
  score: z.number().min(0).max(10),
  reasoning: z.string().optional(),
});

const CreateEvaluationCommentSchema = z.object({
  evaluationId: z.string(),
  questionKey: z.string().optional(),
  comment: z.string(),
  isPrivate: z.boolean().default(true),
});

const UpdateConsensusSchema = z.object({
  applicationId: z.string(),
  finalDecision: z.enum(["ACCEPT", "REJECT", "WAITLIST"]).optional(),
  consensusScore: z.number().min(0).max(10).optional(),
  discussionNotes: z.string().optional(),
});

// Helper function to calculate weighted score
async function calculateWeightedScore(
  prisma: {
    evaluationScore: {
      findMany: (args: {
        where: { evaluationId: string };
        include: { criteria: true };
      }) => Promise<
        Array<{
          score: number;
          criteria: { weight: number };
        }>
      >;
    };
  },
  evaluationId: string,
): Promise<number> {
  const scores = await prisma.evaluationScore.findMany({
    where: { evaluationId },
    include: { criteria: true },
  });

  if (scores.length === 0) return 0;

  const totalWeightedScore = scores.reduce((sum: number, score) => {
    return sum + score.score * score.criteria.weight;
  }, 0);

  const totalWeight = scores.reduce(
    (sum: number, score) => sum + score.criteria.weight,
    0,
  );

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}
// AutoScore schema
const AutoScoreApplicationSchema = z.object({
  applicationId: z.string(),
  stage: z.enum([
    "SCREENING",
    "DETAILED_REVIEW",
    "VIDEO_REVIEW",
    "CONSENSUS",
    "FINAL_DECISION",
  ]),
});
export const evaluationRouter = createTRPCRouter({
  // Get all evaluation criteria
  getCriteria: protectedProcedure.query(async ({ ctx }) => {
    checkAdminAccess(ctx.session.user.role);

    return await ctx.db.evaluationCriteria.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  }),

  // Create reviewer assignment
  createAssignment: protectedProcedure
    .input(CreateReviewerAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      // Check if the assigned reviewer is an AI reviewer
      const reviewer = await ctx.db.user.findUnique({
        where: { id: input.reviewerId },
        select: { id: true, name: true, email: true, isAIReviewer: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }

      // Create the assignment
      const assignment = await ctx.db.reviewerAssignment.create({
        data: input,
        include: {
          reviewer: {
            select: { id: true, name: true, email: true, isAIReviewer: true },
          },
          application: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
              event: { select: { name: true } },
            },
          },
        },
      });

      // Create corresponding evaluation record
      const evaluation = await ctx.db.applicationEvaluation.create({
        data: {
          applicationId: input.applicationId,
          reviewerId: input.reviewerId,
          assignmentId: assignment.id,
          stage: input.stage,
          status: "PENDING",
        },
      });

      // If this is an AI reviewer, automatically trigger AI evaluation
      if (reviewer.isAIReviewer) {
        // Process AI evaluation asynchronously to avoid blocking the assignment response
        void (async () => {
          try {
            console.log(
              `[AI Evaluation] Starting AI evaluation for evaluation ID: ${evaluation.id}, application: ${input.applicationId}`,
            );

            // Get full application data for AI evaluation
            const applicationWithData = await ctx.db.application.findUnique({
              where: { id: input.applicationId },
              include: {
                responses: {
                  include: { question: true },
                  orderBy: { question: { order: "asc" } },
                },
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    surname: true,
                    name: true,
                    email: true,
                    adminNotes: true,
                    adminWorkExperience: true,
                    adminLabels: true,
                  },
                },
                event: { select: { name: true } },
              },
            });

            if (!applicationWithData) {
              console.error(
                `[AI Evaluation] Application ${input.applicationId} not found`,
              );
              return;
            }

            // Get evaluation criteria
            const criteria = await ctx.db.evaluationCriteria.findMany({
              where: { isActive: true },
              orderBy: { order: "asc" },
            });

            if (criteria.length === 0) {
              console.error("[AI Evaluation] No evaluation criteria found");
              return;
            }

            console.log(
              `[AI Evaluation] Found ${criteria.length} criteria, proceeding with AI evaluation`,
            );

            // Use AI service to generate scores
            const aiService = getAIEvaluationService();
            const autoScoreResult = await aiService.evaluateApplication({
              application: applicationWithData,
              criteria,
              stage: input.stage,
            });

            console.log(
              `[AI Evaluation] AI service returned ${autoScoreResult.scores?.length || 0} scores`,
            );

            // Use transaction to ensure data consistency
            await ctx.db.$transaction(async (tx) => {
              // Create scores in the database
              if (autoScoreResult.scores) {
                for (const scoreData of autoScoreResult.scores) {
                  await tx.evaluationScore.create({
                    data: {
                      evaluationId: evaluation.id,
                      criteriaId: scoreData.criteriaId,
                      score: scoreData.score,
                      reasoning: scoreData.reasoning,
                    },
                  });
                }

                // Calculate weighted overall score
                const weightedScore = await calculateWeightedScore(
                  tx,
                  evaluation.id,
                );

                // Update evaluation with AI results
                await tx.applicationEvaluation.update({
                  where: { id: evaluation.id },
                  data: {
                    overallScore: weightedScore,
                    overallComments: autoScoreResult.overallComments,
                    recommendation: autoScoreResult.recommendation,
                    confidence: autoScoreResult.confidence,
                    status: "COMPLETED",
                    completedAt: new Date(),
                  },
                });

                console.log(
                  `[AI Evaluation] Successfully completed AI evaluation for evaluation ID: ${evaluation.id}`,
                );
              }
            });
          } catch (error) {
            console.error(
              `[AI Evaluation] Failed for evaluation ID ${evaluation.id}:`,
              error,
            );

            // Mark evaluation as failed but don't leave it in PENDING state
            try {
              await ctx.db.applicationEvaluation.update({
                where: { id: evaluation.id },
                data: {
                  status: "PENDING", // Keep as pending so admin can manually review
                  overallComments: `AI evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
              });
            } catch (updateError) {
              console.error(
                `[AI Evaluation] Failed to update evaluation status:`,
                updateError,
              );
            }
          }
        })();
      }

      return assignment;
    }),

  // Create multiple reviewer assignments
  bulkCreateAssignments: protectedProcedure
    .input(BulkCreateAssignmentsSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const { applicationIds, reviewerId, stage, priority, dueDate, notes } =
        input;

      // Check if the assigned reviewer is an AI reviewer
      const reviewer = await ctx.db.user.findUnique({
        where: { id: reviewerId },
        select: { id: true, name: true, email: true, isAIReviewer: true },
      });

      if (!reviewer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reviewer not found",
        });
      }

      // Check for existing assignments to prevent duplicates
      const existingAssignments = await ctx.db.reviewerAssignment.findMany({
        where: {
          applicationId: { in: applicationIds },
          reviewerId,
          stage,
        },
        select: { applicationId: true },
      });

      const existingApplicationIds = new Set(
        existingAssignments.map((a) => a.applicationId),
      );
      const newApplicationIds = applicationIds.filter(
        (id) => !existingApplicationIds.has(id),
      );

      if (newApplicationIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "All selected applications are already assigned to this reviewer for this stage",
        });
      }

      // Create assignments in batch
      const assignmentData = newApplicationIds.map((applicationId) => ({
        applicationId,
        reviewerId,
        stage,
        priority,
        dueDate,
        notes:
          notes ??
          `Bulk assigned for ${stage.replace("_", " ").toLowerCase()} review`,
      }));

      const assignments = await ctx.db.$transaction(async (tx) => {
        // Create assignments
        await tx.reviewerAssignment.createMany({
          data: assignmentData,
        });

        // Get created assignments with relations
        const createdAssignments = await tx.reviewerAssignment.findMany({
          where: {
            applicationId: { in: newApplicationIds },
            reviewerId,
            stage,
          },
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                surname: true,
                name: true,
                email: true,
                isAIReviewer: true,
              },
            },
            application: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    surname: true,
                    name: true,
                    email: true,
                  },
                },
                event: { select: { name: true } },
              },
            },
          },
        });

        // Create corresponding evaluation records
        const evaluationData = createdAssignments.map((assignment) => ({
          applicationId: assignment.applicationId,
          reviewerId: assignment.reviewerId,
          assignmentId: assignment.id,
          stage: assignment.stage,
          status: "PENDING" as const,
        }));

        await tx.applicationEvaluation.createMany({
          data: evaluationData,
        });

        return createdAssignments;
      });

      // If this is an AI reviewer, automatically trigger AI evaluation for all assignments
      if (reviewer.isAIReviewer) {
        // Process AI evaluations asynchronously to avoid blocking the response
        void (async () => {
          console.log(
            `[AI Bulk Evaluation] Starting bulk AI evaluation for ${newApplicationIds.length} applications`,
          );

          // Process AI evaluations in parallel for better performance
          const aiEvaluationPromises = newApplicationIds.map(
            async (applicationId) => {
              try {
                console.log(
                  `[AI Bulk Evaluation] Processing application: ${applicationId}`,
                );

                // Get full application data for AI evaluation
                const applicationWithData = await ctx.db.application.findUnique(
                  {
                    where: { id: applicationId },
                    include: {
                      responses: {
                        include: { question: true },
                        orderBy: { question: { order: "asc" } },
                      },
                      user: {
                        select: {
                          id: true,
                          firstName: true,
                          surname: true,
                          name: true,
                          email: true,
                          adminNotes: true,
                          adminWorkExperience: true,
                          adminLabels: true,
                        },
                      },
                      event: { select: { name: true } },
                    },
                  },
                );

                if (!applicationWithData) {
                  console.error(
                    `[AI Bulk Evaluation] Application ${applicationId} not found`,
                  );
                  return;
                }

                // Get evaluation criteria
                const criteria = await ctx.db.evaluationCriteria.findMany({
                  where: { isActive: true },
                  orderBy: { order: "asc" },
                });

                if (criteria.length === 0) {
                  console.error(
                    "[AI Bulk Evaluation] No evaluation criteria found",
                  );
                  return;
                }

                // Find the evaluation record for this application
                const evaluation =
                  await ctx.db.applicationEvaluation.findUnique({
                    where: {
                      applicationId_reviewerId_stage: {
                        applicationId,
                        reviewerId,
                        stage,
                      },
                    },
                  });

                if (!evaluation) {
                  console.error(
                    `[AI Bulk Evaluation] Evaluation not found for application ${applicationId}`,
                  );
                  return;
                }

                console.log(
                  `[AI Bulk Evaluation] Found evaluation ${evaluation.id}, proceeding with AI evaluation`,
                );

                // Use AI service to generate scores
                const aiService = getAIEvaluationService();
                const autoScoreResult = await aiService.evaluateApplication({
                  application: applicationWithData,
                  criteria,
                  stage,
                });

                console.log(
                  `[AI Bulk Evaluation] AI service returned ${autoScoreResult.scores?.length || 0} scores for application ${applicationId}`,
                );

                // Use transaction to ensure data consistency
                await ctx.db.$transaction(async (tx) => {
                  // Create scores in the database
                  if (autoScoreResult.scores) {
                    for (const scoreData of autoScoreResult.scores) {
                      await tx.evaluationScore.create({
                        data: {
                          evaluationId: evaluation.id,
                          criteriaId: scoreData.criteriaId,
                          score: scoreData.score,
                          reasoning: scoreData.reasoning,
                        },
                      });
                    }

                    // Calculate weighted overall score
                    const weightedScore = await calculateWeightedScore(
                      tx,
                      evaluation.id,
                    );

                    // Update evaluation with AI results
                    await tx.applicationEvaluation.update({
                      where: { id: evaluation.id },
                      data: {
                        overallScore: weightedScore,
                        overallComments: autoScoreResult.overallComments,
                        recommendation: autoScoreResult.recommendation,
                        confidence: autoScoreResult.confidence,
                        status: "COMPLETED",
                        completedAt: new Date(),
                      },
                    });

                    console.log(
                      `[AI Bulk Evaluation] Successfully completed AI evaluation for application ${applicationId}, evaluation ${evaluation.id}`,
                    );
                  }
                });
              } catch (error) {
                console.error(
                  `[AI Bulk Evaluation] Failed for application ${applicationId}:`,
                  error,
                );

                // Try to mark evaluation as failed
                try {
                  const evaluation =
                    await ctx.db.applicationEvaluation.findUnique({
                      where: {
                        applicationId_reviewerId_stage: {
                          applicationId,
                          reviewerId,
                          stage,
                        },
                      },
                    });

                  if (evaluation) {
                    await ctx.db.applicationEvaluation.update({
                      where: { id: evaluation.id },
                      data: {
                        status: "PENDING",
                        overallComments: `AI evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                      },
                    });
                  }
                } catch (updateError) {
                  console.error(
                    `[AI Bulk Evaluation] Failed to update evaluation status for ${applicationId}:`,
                    updateError,
                  );
                }
              }
            },
          );

          // Execute all AI evaluations in parallel
          await Promise.all(aiEvaluationPromises);
          console.log(
            `[AI Bulk Evaluation] Completed bulk AI evaluation for ${newApplicationIds.length} applications`,
          );
        })();
      }

      return {
        assignments,
        created: assignments.length,
        skipped: existingApplicationIds.size,
        total: applicationIds.length,
      };
    }),

  // Get assignments for a reviewer
  getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return await ctx.db.reviewerAssignment.findMany({
      where: { reviewerId: userId },
      include: {
        application: {
          select: {
            id: true,
            email: true,
            status: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            event: { select: { name: true } },
          },
        },
        evaluations: {
          select: {
            id: true,
            status: true,
            overallScore: true,
            recommendation: true,
            completedAt: true,
          },
        },
      },
      orderBy: [{ priority: "desc" }, { assignedAt: "asc" }],
    });
  }),

  // Get evaluation for a specific assignment
  getEvaluation: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        stage: z.enum([
          "SCREENING",
          "DETAILED_REVIEW",
          "VIDEO_REVIEW",
          "CONSENSUS",
          "FINAL_DECISION",
        ]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return await ctx.db.applicationEvaluation.findUnique({
        where: {
          applicationId_reviewerId_stage: {
            applicationId: input.applicationId,
            reviewerId: userId,
            stage: input.stage,
          },
        },
        include: {
          scores: {
            include: { criteria: true },
            orderBy: { criteria: { order: "asc" } },
          },
          comments: {
            orderBy: { createdAt: "desc" },
          },
          application: {
            include: {
              responses: {
                include: { question: true },
                orderBy: { question: { order: "asc" } },
              },
              user: {
                select: {
                  id: true,
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                  adminNotes: true,
                  adminWorkExperience: true,
                  adminLabels: true,
                },
              },
              event: { select: { name: true } },
            },
          },
        },
      });
    }),

  // Update evaluation
  updateEvaluation: protectedProcedure
    .input(UpdateEvaluationSchema)
    .mutation(async ({ ctx, input }) => {
      const { evaluationId, ...updateData } = input;
      const userId = ctx.session.user.id;

      // Verify the evaluation belongs to the current user or user is admin
      const evaluation = await ctx.db.applicationEvaluation.findUnique({
        where: { id: evaluationId },
        select: { reviewerId: true },
      });

      if (!evaluation) {
        throw new Error("Evaluation not found");
      }

      if (
        evaluation.reviewerId !== userId &&
        !ctx.session.user.role?.includes("admin")
      ) {
        throw new Error("Unauthorized to update this evaluation");
      }

      // Set completed timestamp if status is being set to COMPLETED
      const finalUpdateData = { ...updateData };
      if (updateData.status === "COMPLETED") {
        finalUpdateData.completedAt = new Date();
      }

      const updatedEvaluation = await ctx.db.applicationEvaluation.update({
        where: { id: evaluationId },
        data: finalUpdateData,
        include: {
          scores: { include: { criteria: true } },
        },
      });

      // Recalculate overall score if scores exist
      if (updatedEvaluation.scores.length > 0) {
        const weightedScore = await calculateWeightedScore(
          ctx.db,
          evaluationId,
        );
        await ctx.db.applicationEvaluation.update({
          where: { id: evaluationId },
          data: { overallScore: weightedScore },
        });
      }

      return updatedEvaluation;
    }),

  // Create or update evaluation score
  upsertScore: protectedProcedure
    .input(CreateEvaluationScoreSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the evaluation belongs to the current user
      const evaluation = await ctx.db.applicationEvaluation.findUnique({
        where: { id: input.evaluationId },
        select: { reviewerId: true },
      });

      if (!evaluation || evaluation.reviewerId !== userId) {
        throw new Error("Unauthorized to update this evaluation");
      }

      const score = await ctx.db.evaluationScore.upsert({
        where: {
          evaluationId_criteriaId: {
            evaluationId: input.evaluationId,
            criteriaId: input.criteriaId,
          },
        },
        create: input,
        update: {
          score: input.score,
          reasoning: input.reasoning,
        },
        include: { criteria: true },
      });

      // Recalculate overall score
      const weightedScore = await calculateWeightedScore(
        ctx.db,
        input.evaluationId,
      );
      await ctx.db.applicationEvaluation.update({
        where: { id: input.evaluationId },
        data: { overallScore: weightedScore },
      });

      return score;
    }),

  // Add evaluation comment
  addComment: protectedProcedure
    .input(CreateEvaluationCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the evaluation belongs to the current user
      const evaluation = await ctx.db.applicationEvaluation.findUnique({
        where: { id: input.evaluationId },
        select: { reviewerId: true },
      });

      if (!evaluation || evaluation.reviewerId !== userId) {
        throw new Error("Unauthorized to add comment to this evaluation");
      }

      return await ctx.db.evaluationComment.create({
        data: input,
      });
    }),

  // Get application summary for review pipeline
  getApplicationSummary: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      return await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { name: true } },
          evaluations: {
            include: {
              reviewer: {
                select: {
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                },
              },
              scores: {
                include: { criteria: true },
              },
            },
          },
          consensus: true,
          reviewerAssignments: {
            include: {
              reviewer: { select: { name: true, email: true } },
            },
          },
        },
      });
    }),

  // Update consensus decision
  updateConsensus: protectedProcedure
    .input(UpdateConsensusSchema)
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const { applicationId, ...consensusData } = input;

      return await ctx.db.reviewConsensus.upsert({
        where: { applicationId },
        create: {
          applicationId,
          ...consensusData,
          decidedBy: ctx.session.user.id,
          decidedAt: consensusData.finalDecision ? new Date() : undefined,
        },
        update: {
          ...consensusData,
          decidedBy: ctx.session.user.id,
          decidedAt: consensusData.finalDecision ? new Date() : undefined,
        },
      });
    }),

  // Get review pipeline overview
  getReviewPipeline: protectedProcedure
    .input(
      z
        .object({
          reviewerId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const applications = await ctx.db.application.findMany({
        where: {
          status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
        },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { name: true } },
          evaluations: {
            select: {
              stage: true,
              status: true,
              overallScore: true,
              recommendation: true,
              reviewerId: true,
              reviewer: { select: { name: true } },
            },
          },
          consensus: {
            select: {
              finalDecision: true,
              consensusScore: true,
              decidedAt: true,
            },
          },
          responses: {
            select: {
              answer: true,
              question: {
                select: {
                  questionKey: true,
                },
              },
            },
          },
        },
      });

      // Filter by reviewer if specified
      let filteredApplications = applications;
      if (input?.reviewerId) {
        filteredApplications = applications.filter((app) =>
          app.evaluations.some(
            (evaluation) => evaluation.reviewerId === input.reviewerId,
          ),
        );
      }

      // Simplified 2-stage pipeline: Application Review → Consensus
      const pipeline = {
        applicationReview: filteredApplications.filter(
          (app) =>
            // Applications that have no completed evaluations or are still being reviewed
            !app.evaluations.some((e) => e.status === "COMPLETED") &&
            !app.consensus?.finalDecision,
        ),
        consensus: filteredApplications.filter(
          (app) =>
            // Applications that have at least one completed evaluation but no final decision
            app.evaluations.some((e) => e.status === "COMPLETED") &&
            !app.consensus?.finalDecision,
        ),
        finalDecision: filteredApplications.filter(
          (app) => app.consensus?.finalDecision,
        ),
      };

      return pipeline;
    }),

  // Get consensus data for an application (all completed evaluations)
  getConsensusData: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      const application = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { id: true, name: true } },
          evaluations: {
            where: { status: "COMPLETED" },
            include: {
              reviewer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
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
                include: { criteria: true },
                orderBy: { criteria: { order: "asc" } },
              },
              comments: {
                orderBy: { createdAt: "desc" },
              },
            },
            orderBy: { completedAt: "desc" },
          },
          consensus: true,
          responses: {
            include: { question: true },
            orderBy: { question: { order: "asc" } },
          },
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      return application;
    }),

  // Reviewer Competency Management

  // Get reviewer competencies
  getReviewerCompetencies: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string().optional(), // If omitted, gets current user's competencies
      }),
    )
    .query(async ({ ctx, input }) => {
      const reviewerId = input.reviewerId ?? ctx.session.user.id;

      // Only admins can view other reviewers' competencies
      if (input.reviewerId && !ctx.session.user.role?.includes("admin")) {
        checkAdminAccess(ctx.session.user.role);
      }

      return await ctx.db.reviewerCompetency.findMany({
        where: { reviewerId },
        include: {
          reviewer: { select: { name: true, email: true } },
          assignedByUser: {
            select: { firstName: true, surname: true, name: true, email: true },
          },
        },
        orderBy: { category: "asc" },
      });
    }),

  // Set reviewer competency
  setReviewerCompetency: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string(),
        category: z.enum([
          "TECHNICAL",
          "PROJECT",
          "COMMUNITY_FIT",
          "VIDEO",
          "OVERALL",
        ]),
        competencyLevel: z.number().int().min(1).max(5),
        baseWeight: z.number().min(0.1).max(5.0).default(1.0),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      return await ctx.db.reviewerCompetency.upsert({
        where: {
          reviewerId_category: {
            reviewerId: input.reviewerId,
            category: input.category,
          },
        },
        create: {
          reviewerId: input.reviewerId,
          category: input.category,
          competencyLevel: input.competencyLevel,
          baseWeight: input.baseWeight,
          notes: input.notes,
          assignedBy: ctx.session.user.id,
        },
        update: {
          competencyLevel: input.competencyLevel,
          baseWeight: input.baseWeight,
          notes: input.notes,
          assignedBy: ctx.session.user.id,
          updatedAt: new Date(),
        },
        include: {
          reviewer: { select: { name: true, email: true } },
          assignedByUser: {
            select: { firstName: true, surname: true, name: true, email: true },
          },
        },
      });
    }),

  // Bulk set reviewer competencies
  bulkSetReviewerCompetencies: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string(),
        competencies: z.array(
          z.object({
            category: z.enum([
              "TECHNICAL",
              "PROJECT",
              "COMMUNITY_FIT",
              "VIDEO",
              "ENTREPRENEURIAL",
              "OVERALL",
            ]),
            competencyLevel: z.number().int().min(1).max(5),
            baseWeight: z.number().min(0.1).max(5.0).default(1.0),
            notes: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      return await ctx.db.$transaction(async (tx) => {
        const results = [];

        for (const competency of input.competencies) {
          const result = await tx.reviewerCompetency.upsert({
            where: {
              reviewerId_category: {
                reviewerId: input.reviewerId,
                category: competency.category,
              },
            },
            create: {
              reviewerId: input.reviewerId,
              category: competency.category,
              competencyLevel: competency.competencyLevel,
              baseWeight: competency.baseWeight,
              notes: competency.notes,
              assignedBy: ctx.session.user.id,
            },
            update: {
              competencyLevel: competency.competencyLevel,
              baseWeight: competency.baseWeight,
              notes: competency.notes,
              assignedBy: ctx.session.user.id,
              updatedAt: new Date(),
            },
            include: {
              reviewer: {
                select: {
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                },
              },
              assignedByUser: {
                select: {
                  firstName: true,
                  surname: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
          results.push(result);
        }

        return results;
      });
    }),

  // Remove reviewer competency
  removeReviewerCompetency: protectedProcedure
    .input(
      z.object({
        reviewerId: z.string(),
        category: z.enum([
          "TECHNICAL",
          "PROJECT",
          "COMMUNITY_FIT",
          "VIDEO",
          "OVERALL",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      checkAdminAccess(ctx.session.user.role);

      return await ctx.db.reviewerCompetency.delete({
        where: {
          reviewerId_category: {
            reviewerId: input.reviewerId,
            category: input.category,
          },
        },
      });
    }),

  // Get available applications for self-assignment queue
  getAvailableApplications: protectedProcedure
    .input(
      z
        .object({
          eventId: z.string().optional(), // Filter by specific event
          stage: z
            .enum(["SCREENING", "DETAILED_REVIEW", "VIDEO_REVIEW"])
            .optional(),
          limit: z.number().int().positive().max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { eventId, stage = "SCREENING", limit = 20 } = input ?? {};

      return await ctx.db.application.findMany({
        where: {
          status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
          ...(eventId && { eventId }),
          // Exclude applications already assigned to current reviewer
          NOT: {
            reviewerAssignments: {
              some: {
                reviewerId: userId,
                stage: stage,
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          event: { select: { id: true, name: true } },
          // Count existing assignments for this stage
          reviewerAssignments: {
            where: { stage },
            select: {
              id: true,
              reviewer: { select: { name: true } },
            },
          },
          // Count existing evaluations for this stage
          evaluations: {
            where: { stage },
            select: {
              status: true,
              reviewer: { select: { name: true } },
            },
          },
        },
        orderBy: [
          { submittedAt: "asc" }, // Oldest submissions first
          { createdAt: "asc" },
        ],
        take: limit,
      });
    }),

  // Self-assign to an application for review
  selfAssignToApplication: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        stage: z
          .enum(["SCREENING", "DETAILED_REVIEW", "VIDEO_REVIEW"])
          .default("SCREENING"),
        priority: z.number().int().min(0).max(10).default(0),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { applicationId, stage, priority, notes } = input;

      // Check if application exists and is available for review
      const application = await ctx.db.application.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          status: true,
          user: { select: { name: true, email: true } },
          event: { select: { name: true } },
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      if (!["SUBMITTED", "UNDER_REVIEW"].includes(application.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Application is not available for review",
        });
      }

      // Check if already assigned to this reviewer for this stage
      const existingAssignment = await ctx.db.reviewerAssignment.findUnique({
        where: {
          applicationId_reviewerId_stage: {
            applicationId,
            reviewerId: userId,
            stage,
          },
        },
      });

      if (existingAssignment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You are already assigned to review this application at this stage",
        });
      }

      // Create assignment and evaluation in transaction
      return await ctx.db.$transaction(async (tx) => {
        // Create reviewer assignment
        const assignment = await tx.reviewerAssignment.create({
          data: {
            applicationId,
            reviewerId: userId,
            stage,
            priority,
            notes: notes ?? "Self-assigned from review queue",
          },
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                surname: true,
                name: true,
                email: true,
              },
            },
            application: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    surname: true,
                    name: true,
                    email: true,
                  },
                },
                event: { select: { name: true } },
              },
            },
          },
        });

        // Create corresponding evaluation record
        const evaluation = await tx.applicationEvaluation.create({
          data: {
            applicationId,
            reviewerId: userId,
            assignmentId: assignment.id,
            stage,
            status: "PENDING",
          },
          include: {
            application: {
              select: {
                id: true,
                user: {
                  select: {
                    firstName: true,
                    surname: true,
                    name: true,
                    email: true,
                  },
                },
                event: { select: { name: true } },
              },
            },
          },
        });

        return { assignment, evaluation };
      });
    }),

  // Get all reviewers with their competencies (for admin management)
  getAllReviewersWithCompetencies: protectedProcedure.query(async ({ ctx }) => {
    checkAdminAccess(ctx.session.user.role);

    return await ctx.db.user.findMany({
      where: {
        OR: [
          { role: { contains: "admin" } },
          { reviewerAssignments: { some: {} } },
          { applicationEvaluations: { some: {} } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        reviewerCompetencies: {
          include: {
            assignedByUser: {
              select: {
                firstName: true,
                surname: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { category: "asc" },
        },
        _count: {
          select: {
            reviewerAssignments: true,
            applicationEvaluations: { where: { status: "COMPLETED" } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  // Get evaluation by ID (for direct evaluation page access)
  getEvaluationById: protectedProcedure
    .input(
      z.object({
        evaluationId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const evaluation = await ctx.db.applicationEvaluation.findUnique({
        where: { id: input.evaluationId },
        select: {
          id: true,
          applicationId: true,
          reviewerId: true,
          stage: true,
          status: true,
        },
      });

      if (!evaluation) {
        throw new Error("Evaluation not found");
      }

      // Verify the evaluation belongs to the current user or user is admin
      if (
        evaluation.reviewerId !== userId &&
        !ctx.session.user.role?.includes("admin")
      ) {
        throw new Error("Unauthorized to view this evaluation");
      }

      // For CONSENSUS stage, return enhanced data similar to getConsensusData
      if (evaluation.stage === "CONSENSUS") {
        const application = await ctx.db.application.findUnique({
          where: { id: evaluation.applicationId },
          include: {
            user: { select: { name: true, email: true } },
            event: { select: { name: true } },
            evaluations: {
              where: { status: "COMPLETED" },
              include: {
                reviewer: {
                  select: {
                    id: true,
                    firstName: true,
                    surname: true,
                    name: true,
                    email: true,
                    image: true,
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
                  include: { criteria: true },
                  orderBy: { criteria: { order: "asc" } },
                },
                comments: {
                  orderBy: { createdAt: "desc" },
                },
              },
              orderBy: { completedAt: "desc" },
            },
            consensus: true,
            responses: {
              include: { question: true },
              orderBy: { question: { order: "asc" } },
            },
          },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found",
          });
        }

        return {
          id: evaluation.id,
          applicationId: evaluation.applicationId,
          stage: evaluation.stage,
          status: evaluation.status,
          consensusData: application,
        };
      }

      return {
        id: evaluation.id,
        applicationId: evaluation.applicationId,
        stage: evaluation.stage,
        status: evaluation.status,
      };
    }),
  // AutoScore application using AI
  autoScoreApplication: protectedProcedure
    .input(AutoScoreApplicationSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { applicationId, stage } = input;

      // Get the evaluation to verify ownership
      const evaluation = await ctx.db.applicationEvaluation.findUnique({
        where: {
          applicationId_reviewerId_stage: {
            applicationId,
            reviewerId: userId,
            stage,
          },
        },
        include: {
          application: {
            include: {
              responses: {
                include: { question: true },
                orderBy: { question: { order: "asc" } },
              },
              user: { select: { id: true, name: true, email: true } },
              event: { select: { name: true } },
            },
          },
        },
      });

      if (!evaluation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Evaluation not found or not assigned to you",
        });
      }

      // Get evaluation criteria
      const criteria = await ctx.db.evaluationCriteria.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });

      if (!criteria.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No evaluation criteria found",
        });
      }

      // Use AI service to generate scores
      const aiService = getAIEvaluationService();
      const autoScoreResult = await aiService.evaluateApplication({
        application: evaluation.application,
        criteria,
        stage,
      });

      return {
        scores: autoScoreResult.scores,
        overallComments: autoScoreResult.overallComments,
        recommendation: autoScoreResult.recommendation,
        confidence: autoScoreResult.confidence,
      };
    }),
});
