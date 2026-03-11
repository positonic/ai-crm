import { db } from "~/server/db";
import { withMastraAuth } from "~/utils/validateApiKey";

async function GET() {
  try {
    // Simple database connection test
    const result = await db.$queryRaw`SELECT 1 as test`;
    return Response.json({
      success: true,
      data: {
        message: "Database connection successful",
        result,
      },
    });
  } catch (error) {
    console.error("[MASTRA API] Error in test endpoint:", error);

    return Response.json(
      {
        success: false,
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

const authenticatedGET = withMastraAuth(GET);
export { authenticatedGET as GET };
