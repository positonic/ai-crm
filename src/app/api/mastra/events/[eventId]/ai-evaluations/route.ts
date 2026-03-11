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

// GET: Retrieve AI evaluations for the event
async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;

  try {
    // Get AI evaluations (identified by special AI reviewer)
    const aiEvaluations = await db.applicationEvaluation.findMany({
      where: {
        application: {
          eventId: eventId,
        },
        reviewer: {
          email: "ai-reviewer@fundingthecommons.io", // Special AI reviewer account
        },
      },
      include: {
        application: {
          select: {
            id: true,
            userId: true,
            status: true,
            submittedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
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
                category: true,
                weight: true,
              },
            },
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    return Response.json({
      success: true,
      data: {
        eventId,
        evaluations: aiEvaluations.map((evaluation) => ({
          id: evaluation.id,
          applicationId: evaluation.applicationId,
          stage: evaluation.stage,
          status: evaluation.status,
          overallScore: evaluation.overallScore,
          confidence: evaluation.confidence,
          recommendation: evaluation.recommendation,
          overallComments: evaluation.overallComments,
          timeSpentMinutes: evaluation.timeSpentMinutes,
          completedAt: evaluation.completedAt,
          application: evaluation.application,
          scores: evaluation.scores.map((score) => ({
            criteriaId: score.criteriaId,
            criteriaName: score.criteria.name,
            category: score.criteria.category,
            score: score.score,
            reasoning: score.reasoning,
          })),
          // AI metadata not stored in current schema
          aiMetadata: null,
        })),
        totalCount: aiEvaluations.length,
        metadata: {
          generatedAt: new Date().toISOString(),
          purpose: "AI evaluation results for analysis and comparison",
        },
      },
    });
  } catch (error) {
    console.error("[MASTRA API] Error fetching AI evaluations:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to fetch AI evaluations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST: Submit a single AI evaluation
async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;

  try {
    const body = (await request.json()) as unknown;
    const evaluation = AIEvaluationSchema.parse(body);

    // Verify application exists and belongs to this event
    const application = await db.application.findFirst({
      where: {
        id: evaluation.applicationId,
        eventId: eventId,
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

    // Create or find reviewer assignment
    let assignment = await db.reviewerAssignment.findUnique({
      where: {
        applicationId_reviewerId_stage: {
          applicationId: evaluation.applicationId,
          reviewerId: aiReviewer.id,
          stage: evaluation.stage,
        },
      },
    });

    assignment ??= await db.reviewerAssignment.create({
      data: {
        applicationId: evaluation.applicationId,
        reviewerId: aiReviewer.id,
        stage: evaluation.stage,
        assignedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Create the evaluation
    const newEvaluation = await db.applicationEvaluation.create({
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
      await db.evaluationScore.create({
        data: {
          evaluationId: newEvaluation.id,
          criteriaId: score.criteriaId,
          score: score.score,
          reasoning: score.reasoning,
        },
      });
    }

    return Response.json({
      success: true,
      data: {
        evaluationId: newEvaluation.id,
        applicationId: evaluation.applicationId,
        status: "created",
        metadata: {
          createdAt: newEvaluation.createdAt,
          aiMetadata: evaluation.aiMetadata,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: "Invalid evaluation data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("[MASTRA API] Error creating AI evaluation:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to create AI evaluation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated versions of the handlers
const authenticatedGET = withMastraAuth(GET);
const authenticatedPOST = withMastraAuth(POST);
export { authenticatedGET as GET, authenticatedPOST as POST };
