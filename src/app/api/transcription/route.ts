import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { withTranscriptionAuth } from "~/utils/validateApiKey";

const VALID_SOURCES = [
  "MANUAL",
  "WHISPER_API",
  "BROWSER",
  "WEBHOOK",
  "API",
] as const;
const VALID_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

type TranscriptionSource = (typeof VALID_SOURCES)[number];
type TranscriptStatus = (typeof VALID_STATUSES)[number];

interface CreateTranscriptionBody {
  title: string;
  transcript?: string;
  summary?: string;
  notes?: string;
  eventId?: string;
  deliberationId?: string;
  source?: TranscriptionSource;
  sourceSessionId?: string;
  status?: TranscriptStatus;
  audioUrl?: string;
  audioFileName?: string;
}

async function handlePost(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTranscriptionBody;

    if (!body.title?.trim()) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    if (body.source && !VALID_SOURCES.includes(body.source)) {
      return Response.json(
        {
          error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}`,
        },
        { status: 400 },
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

    // Determine status: if transcript provided and no explicit status, mark COMPLETED
    const status = body.status ?? (body.transcript ? "COMPLETED" : "PENDING");

    // Upsert by sourceSessionId if provided
    if (body.sourceSessionId) {
      const existing = await db.transcription.findUnique({
        where: { sourceSessionId: body.sourceSessionId },
      });

      if (existing) {
        const updated = await db.transcription.update({
          where: { id: existing.id },
          data: {
            title: body.title.trim(),
            transcript: body.transcript ?? existing.transcript,
            summary: body.summary ?? existing.summary,
            notes: body.notes ?? existing.notes,
            status,
            eventId: body.eventId ?? existing.eventId,
            deliberationId: body.deliberationId ?? existing.deliberationId,
            audioUrl: body.audioUrl ?? existing.audioUrl,
            audioFileName: body.audioFileName ?? existing.audioFileName,
            processedAt:
              status === "COMPLETED" ? new Date() : existing.processedAt,
          },
        });

        return Response.json({
          id: updated.id,
          sourceSessionId: updated.sourceSessionId,
          status: updated.status,
          created: false,
        });
      }
    }

    const transcription = await db.transcription.create({
      data: {
        title: body.title.trim(),
        transcript: body.transcript,
        summary: body.summary,
        notes: body.notes,
        eventId: body.eventId,
        deliberationId: body.deliberationId,
        source: body.source ?? "API",
        sourceSessionId: body.sourceSessionId,
        audioUrl: body.audioUrl,
        audioFileName: body.audioFileName,
        status,
        processedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    });

    return Response.json(
      {
        id: transcription.id,
        sourceSessionId: transcription.sourceSessionId,
        status: transcription.status,
        created: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Transcription API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withTranscriptionAuth(handlePost);
