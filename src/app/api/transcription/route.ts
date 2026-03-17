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
  eventSlug?: string;
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

    // Resolve eventSlug to eventId if provided
    if (body.eventSlug && !body.eventId) {
      const event = await db.event.findUnique({
        where: { slug: body.eventSlug },
        select: { id: true },
      });
      if (!event) {
        return Response.json(
          { error: `Event not found with slug: ${body.eventSlug}` },
          { status: 404 },
        );
      }
      body.eventId = event.id;
    }

    // Determine status: if transcript provided and no explicit status, mark COMPLETED
    const status = body.status ?? (body.transcript ? "COMPLETED" : "PENDING");

    // Atomic upsert by sourceSessionId if provided
    if (body.sourceSessionId) {
      // Build update payload — only include fields that are provided,
      // so existing values are preserved for omitted fields
      const updateData: Record<string, unknown> = {
        title: body.title.trim(),
        status,
      };
      if (body.transcript !== undefined) updateData.transcript = body.transcript;
      if (body.summary !== undefined) updateData.summary = body.summary;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.eventId !== undefined) updateData.eventId = body.eventId;
      if (body.deliberationId !== undefined)
        updateData.deliberationId = body.deliberationId;
      if (body.audioUrl !== undefined) updateData.audioUrl = body.audioUrl;
      if (body.audioFileName !== undefined)
        updateData.audioFileName = body.audioFileName;
      if (status === "COMPLETED") updateData.processedAt = new Date();

      const result = await db.transcription.upsert({
        where: { sourceSessionId: body.sourceSessionId },
        update: updateData,
        create: {
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

      // Determine if this was a create or update via timestamps
      const wasCreated =
        result.createdAt.getTime() === result.updatedAt.getTime();

      return Response.json(
        {
          id: result.id,
          sourceSessionId: result.sourceSessionId,
          status: result.status,
          created: wasCreated,
        },
        { status: wasCreated ? 201 : 200 },
      );
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
