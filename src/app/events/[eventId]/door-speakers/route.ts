import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { getDisplayName } from "~/utils/userDisplay";

export const dynamic = "force-dynamic";

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId: eventIdOrSlug } = await context.params;
    console.log("[door-speakers] Resolving event:", eventIdOrSlug);

    // Resolve event by ID or slug
    let event = await db.event.findUnique({
      where: { id: eventIdOrSlug },
      select: { id: true, slug: true, name: true },
    });

    event ??= await db.event.findUnique({
      where: { slug: eventIdOrSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!event) {
      console.log("[door-speakers] Event not found:", eventIdOrSlug);
      return new Response("Event not found", { status: 404 });
    }

    console.log("[door-speakers] Found event:", event.name, event.id);

    // Query all speakers for this event's sessions
    const sessionSpeakers = await db.sessionSpeaker.findMany({
      where: { session: { eventId: event.id } },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            surname: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log("[door-speakers] Found", sessionSpeakers.length, "session speaker records");

    // Deduplicate by user ID
    const speakerMap = new Map<string, { fullName: string; email: string }>();
    for (const sp of sessionSpeakers) {
      if (speakerMap.has(sp.user.id)) continue;

      const fullName = getDisplayName(sp.user, "");

      speakerMap.set(sp.user.id, {
        fullName,
        email: sp.user.email ?? "",
      });
    }

    console.log("[door-speakers] Unique speakers:", speakerMap.size);

    // Build CSV
    const rows = ["Full Name,Email"];
    for (const speaker of speakerMap.values()) {
      rows.push(
        `${escapeCsvField(speaker.fullName)},${escapeCsvField(speaker.email)}`,
      );
    }
    const csv = rows.join("\n");

    const filename = `speakers-${event.slug ?? event.id}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[door-speakers] Failed to generate speakers CSV:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
