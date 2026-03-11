import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withTranscriptionAuth } from "~/utils/validateApiKey";

const VALID_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

type TranscriptStatus = (typeof VALID_STATUSES)[number];

interface UpdateTranscriptionBody {
  transcript?: string;
  summary?: string;
  notes?: string;
  title?: string;
  status?: TranscriptStatus;
}

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const transcription = await db.transcription.findUnique({
      where: { id },
    });

    if (!transcription) {
      return Response.json(
        { error: "Transcription not found" },
        { status: 404 },
      );
    }

    return Response.json(transcription);
  } catch (error) {
    console.error("Transcription GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handlePatch(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateTranscriptionBody;

    const existing = await db.transcription.findUnique({
      where: { id },
    });

    if (!existing) {
      return Response.json(
        { error: "Transcription not found" },
        { status: 404 },
      );
    }

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return Response.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Append transcript text if existing text exists, otherwise set directly
    let transcriptValue = existing.transcript;
    if (body.transcript) {
      transcriptValue = existing.transcript
        ? `${existing.transcript}\n\n${body.transcript}`
        : body.transcript;
    }

    const status = body.status ?? existing.status;

    const updated = await db.transcription.update({
      where: { id },
      data: {
        transcript: transcriptValue,
        summary: body.summary ?? existing.summary,
        notes: body.notes ?? existing.notes,
        title: body.title ?? existing.title,
        status,
        processedAt:
          status === "COMPLETED" && existing.status !== "COMPLETED"
            ? new Date()
            : existing.processedAt,
      },
    });

    return Response.json({
      id: updated.id,
      sourceSessionId: updated.sourceSessionId,
      status: updated.status,
    });
  } catch (error) {
    console.error("Transcription PATCH error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withTranscriptionAuth(handleGet);
export const PATCH = withTranscriptionAuth(handlePatch);
