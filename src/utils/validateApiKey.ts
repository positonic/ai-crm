import type { NextRequest } from "next/server";
import { env } from "~/env";

/**
 * Validates an API key for the Mastra AI agent
 * @param request - The incoming request object
 * @returns boolean - true if valid, false if invalid
 */
export function validateMastraApiKey(request: Request | NextRequest): boolean {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return false;
  }

  const providedKey = authHeader.replace("Bearer ", "");
  return providedKey === env.MASTRA_API_KEY;
}

/**
 * Creates a standardized unauthorized response
 */
export function createUnauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withMastraAuth<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    if (!validateMastraApiKey(request)) {
      return createUnauthorizedResponse();
    }

    return handler(request, ...args);
  };
}

/**
 * Validates an API key for external transcription ingestion
 */
export function validateTranscriptionApiKey(
  request: Request | NextRequest,
): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return false;
  return apiKey === env.TRANSCRIPTION_API_KEY;
}

/**
 * Higher-order function to wrap API route handlers with transcription API key auth
 */
export function withTranscriptionAuth<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    if (!validateTranscriptionApiKey(request)) {
      return createUnauthorizedResponse();
    }
    return handler(request, ...args);
  };
}
