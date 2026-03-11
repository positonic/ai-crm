import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;

  try {
    const data = await db.application.findMany({
      where: { eventId },
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
            question: true,
          },
        },
        evaluations: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            scores: true,
          },
        },
      },
    });

    return Response.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[MASTRA API] Error fetching applications:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to fetch applications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
