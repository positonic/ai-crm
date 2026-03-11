import { type NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allow longer execution for large uploads
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("slides") as File | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json(
        { error: "No sessionId provided" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 },
      );
    }

    // Authorization: check if user is a speaker on this session or admin/staff
    const scheduleSession = await db.scheduleSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        slidesUrl: true,
        sessionSpeakers: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    if (!scheduleSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const isAdmin =
      session.user.role === "admin" || session.user.role === "staff";
    const isSpeaker = scheduleSession.sessionSpeakers.length > 0;

    if (!isAdmin && !isSpeaker) {
      return NextResponse.json(
        { error: "Only session speakers can upload slides" },
        { status: 403 },
      );
    }

    // Delete old blob if replacing
    if (scheduleSession.slidesUrl) {
      try {
        await del(scheduleSession.slidesUrl, {
          token: process.env.PLATFORM_READ_WRITE_TOKEN,
        });
      } catch {
        // Non-blocking: old blob cleanup failure should not prevent new upload
        console.error("Failed to delete old slides blob");
      }
    }

    // Upload to Vercel Blob
    const fileExtension = file.name.split(".").pop() ?? "pdf";
    const fileName = `session-slides/${sessionId}-${Date.now()}.${fileExtension}`;

    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type,
      token: process.env.PLATFORM_READ_WRITE_TOKEN,
    });

    // Update session record
    await db.scheduleSession.update({
      where: { id: sessionId },
      data: {
        slidesUrl: blob.url,
        slidesFileName: file.name,
        slidesUploadedAt: new Date(),
        slidesUploadedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      slidesUrl: blob.url,
      slidesFileName: file.name,
    });
  } catch (error) {
    console.error("Session slides upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload slides. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
