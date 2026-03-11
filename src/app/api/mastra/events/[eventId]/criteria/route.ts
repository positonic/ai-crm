import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  await context.params; // eventId not needed for global criteria

  try {
    const data = await db.evaluationCriteria.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    return Response.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[MASTRA API] Error fetching criteria:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to fetch evaluation criteria",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Export the authenticated version of the handler
const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
