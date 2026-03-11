import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";
import { z } from "zod";

// Schema for AI evaluation submission
const AIEvaluationSchema = z.object({
  applicationId: z.string(),
  stage: z.enum([
    "SCREENING",
    "DETAILED_REVIEW",
    "VIDEO_REVIEW",
    "CONSENSUS",
    "FINAL_DECISION",
  ]),
  overallScore: z.number().min(0).max(100),
  confidence: z.number().min(1).max(5),
  recommendation: z.enum(["ACCEPT", "REJECT", "WAITLIST", "NEEDS_MORE_INFO"]),
  overallComments: z.string(),
  timeSpentMinutes: z.number().optional(),

  // Detailed scores by criteria
  scores: z.array(
    z.object({
      criteriaId: z.string(),
      score: z.number(),
      reasoning: z.string(),
    }),
  ),

  // AI-specific metadata
  aiMetadata: z.object({
    modelVersion: z.string(),
    processingTime: z.number(), // milliseconds
    tokensUsed: z.number().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    promptVersion: z.string().optional(),
    features: z.array(z.string()).optional(), // Features used in evaluation
    debugInfo: z.record(z.unknown()).optional(),
  }),
});

const BatchAIEvaluationSchema = z.object({
  evaluations: z.array(AIEvaluationSchema),
  batchMetadata: z.object({
    batchId: z.string(),
    totalEvaluations: z.number(),
    processingStartTime: z.string(),
    processingEndTime: z.string(),
    modelVersion: z.string(),
    promptVersion: z.string().optional(),
  }),
});

// POST: Submit multiple AI evaluations in batch
async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;

  try {
    const body = (await request.json()) as unknown;
    const batchData = BatchAIEvaluationSchema.parse(body);

    // Verify all applications exist and belong to this event
    const applicationIds = batchData.evaluations.map((e) => e.applicationId);
    const applications = await db.application.findMany({
      where: {
        id: { in: applicationIds },
        eventId: eventId,
      },
      select: { id: true },
    });

    const foundApplicationIds = new Set(applications.map((app) => app.id));
    const missingApplicationIds = applicationIds.filter(
      (id) => !foundApplicationIds.has(id),
    );

    if (missingApplicationIds.length > 0) {
      return Response.json(
        {
          success: false,
          error: "Some applications not found or don't belong to this event",
          details: { missingApplicationIds },
        },
        { status: 404 },
      );
    }

    // Get or create AI reviewer user
    let aiReviewer = await db.user.findUnique({
      where: { email: "ai-reviewer@fundingthecommons.io" },
    });

    aiReviewer ??= await db.user.create({
      data: {
        email: "ai-reviewer@fundingthecommons.io",
        name: "AI Reviewer",
        role: "REVIEWER",
      },
    });
    const results: Array<{
      applicationId: string;
      evaluationId: string;
      status: string;
    }> = [];
    const errors: Array<{ applicationId: string; error: string }> = [];

    // Process evaluations in transaction batches for better performance
    const batchSize = 10;
    for (let i = 0; i < batchData.evaluations.length; i += batchSize) {
      const batch = batchData.evaluations.slice(i, i + batchSize);

      try {
        await db.$transaction(async (tx) => {
          for (const evaluation of batch) {
            try {
              // Create or find reviewer assignment
              let assignment = await tx.reviewerAssignment.findUnique({
                where: {
                  applicationId_reviewerId_stage: {
                    applicationId: evaluation.applicationId,
                    reviewerId: aiReviewer.id,
                    stage: evaluation.stage,
                  },
                },
              });
              assignment ??= await tx.reviewerAssignment.create({
                data: {
                  applicationId: evaluation.applicationId,
                  reviewerId: aiReviewer.id,
                  stage: evaluation.stage,
                  assignedAt: new Date(),
                  completedAt: new Date(),
                },
              });

              // Create the evaluation
              const newEvaluation = await tx.applicationEvaluation.create({
                data: {
                  applicationId: evaluation.applicationId,
                  reviewerId: aiReviewer.id,
                  assignmentId: assignment.id,
                  stage: evaluation.stage,
                  status: "COMPLETED",
                  overallScore: evaluation.overallScore,
                  confidence: evaluation.confidence,
                  recommendation: evaluation.recommendation,
                  overallComments: evaluation.overallComments,
                  timeSpentMinutes: evaluation.timeSpentMinutes ?? 0,
                  completedAt: new Date(),
                },
              });
              // Create individual criteria scores
              for (const score of evaluation.scores) {
                await tx.evaluationScore.create({
                  data: {
                    evaluationId: newEvaluation.id,
                    criteriaId: score.criteriaId,
                    score: score.score,
                    reasoning: score.reasoning,
                  },
                });
              }

              results.push({
                applicationId: evaluation.applicationId,
                evaluationId: newEvaluation.id,
                status: "created",
              });
            } catch (evalError) {
              console.error(
                `Error processing evaluation for application ${evaluation.applicationId}:`,
                evalError,
              );
              errors.push({
                applicationId: evaluation.applicationId,
                error:
                  evalError instanceof Error
                    ? evalError.message
                    : "Unknown error",
              });
            }
          }
        });
      } catch (batchError) {
        console.error(
          `Error processing batch ${i / batchSize + 1}:`,
          batchError,
        );
        // Add all applications in this batch to errors
        batch.forEach((evaluation) => {
          errors.push({
            applicationId: evaluation.applicationId,
            error:
              batchError instanceof Error
                ? batchError.message
                : "Batch processing error",
          });
        });
      }
    }

    // Log batch processing statistics
    console.log(
      `[MASTRA AI BATCH] Processed ${batchData.evaluations.length} evaluations:`,
      {
        successful: results.length,
        errors: errors.length,
        batchId: batchData.batchMetadata.batchId,
        modelVersion: batchData.batchMetadata.modelVersion,
      },
    );

    return Response.json({
      success: errors.length === 0,
      data: {
        batchId: batchData.batchMetadata.batchId,
        totalRequested: batchData.evaluations.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
        batchMetadata: batchData.batchMetadata,
        processingStats: {
          totalProcessingTime:
            new Date(batchData.batchMetadata.processingEndTime).getTime() -
            new Date(batchData.batchMetadata.processingStartTime).getTime(),
          averageTimePerEvaluation:
            batchData.evaluations.length > 0
              ? batchData.evaluations.reduce(
                  (sum, e) => sum + e.aiMetadata.processingTime,
                  0,
                ) / batchData.evaluations.length
              : 0,
          totalTokensUsed: batchData.evaluations.reduce(
            (sum, e) => sum + (e.aiMetadata.tokensUsed ?? 0),
            0,
          ),
        },
        metadata: {
          createdAt: new Date().toISOString(),
          eventId,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: "Invalid batch evaluation data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("[MASTRA API] Error creating batch AI evaluations:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to create batch AI evaluations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedPOST = withMastraAuth(POST);
export { authenticatedPOST as POST };
