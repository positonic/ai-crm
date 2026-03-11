import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;

  try {
    const data = await db.applicationEvaluation.findMany({
      where: {
        application: {
          eventId: eventId,
        },
      },
      include: {
        application: {
          select: {
            id: true,
            userId: true,
            status: true,
            submittedAt: true,
          },
        },
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
        comments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[MASTRA API] Error fetching evaluations:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to fetch evaluations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
