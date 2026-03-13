import type { NextRequest } from "next/server";
import { db } from "~/server/db";

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
  const { eventId: eventIdOrSlug } = await context.params;

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
    return new Response("Event not found", { status: 404 });
  }

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

  // Deduplicate by user ID
  const speakerMap = new Map<string, { fullName: string; email: string }>();
  for (const sp of sessionSpeakers) {
    if (speakerMap.has(sp.user.id)) continue;

    const fullName =
      sp.user.firstName && sp.user.surname
        ? `${sp.user.firstName} ${sp.user.surname}`
        : (sp.user.name ?? "");

    speakerMap.set(sp.user.id, {
      fullName,
      email: sp.user.email ?? "",
    });
  }

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
}
