import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { mastraClient } from "~/lib/mastra";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  pathname: z.string(),
  eventId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log("[AI Chat API] Incoming request");

    const session = await auth();
    if (!session?.user) {
      console.warn("[AI Chat API] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      console.warn(
        "[AI Chat API] Invalid request body:",
        parsed.error.flatten(),
      );
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { messages, pathname, eventId } = parsed.data;
    console.log("[AI Chat API] Request from:", session.user.email, {
      messageCount: messages.length,
      pathname,
      eventId,
    });

    // Build context message with platform state
    const contextParts: string[] = [];
    contextParts.push(
      `User: ${session.user.name ?? session.user.email ?? "Authenticated user"}`,
    );
    contextParts.push(`Current page: ${pathname}`);

    // Add user's global role
    const globalRole = session.user.role ?? "user";
    contextParts.push(`Global role: ${globalRole}`);

    // Resolve eventId (could be a slug or actual ID) once, reuse everywhere
    let resolvedEventId: string | undefined;
    if (eventId) {
      try {
        const eventById = await db.event.findUnique({
          where: { id: eventId },
          select: { id: true },
        });
        if (eventById) {
          resolvedEventId = eventById.id;
        } else {
          const eventBySlug = await db.event.findUnique({
            where: { slug: eventId },
            select: { id: true },
          });
          if (eventBySlug) {
            resolvedEventId = eventBySlug.id;
          }
        }
        console.log("[AI Chat API] Event resolution:", {
          eventId,
          resolvedEventId: resolvedEventId ?? "NOT_FOUND",
        });
      } catch (resolveErr) {
        console.error("[AI Chat API] Event resolution failed:", resolveErr);
      }
    }

    // Fetch event-specific roles if we resolved an event (mirrors getMyRolesForEvent logic)
    // Each role source is fetched independently so one failure doesn't lose all context
    if (resolvedEventId) {
      const eventRoles: string[] = [];

      // Event-specific roles from UserRole table
      try {
        const userRoles = await db.userRole.findMany({
          where: { userId: session.user.id, eventId: resolvedEventId },
          include: { role: { select: { name: true } } },
        });
        for (const ur of userRoles) {
          if (!eventRoles.includes(ur.role.name)) {
            eventRoles.push(ur.role.name);
          }
        }
      } catch (err) {
        console.error("[AI Chat API] Failed to fetch UserRole:", err);
      }

      // Floor lead from VenueOwner table
      try {
        const venueOwnerships = await db.venueOwner.findMany({
          where: { userId: session.user.id, eventId: resolvedEventId },
          select: { venue: { select: { name: true } } },
        });
        if (venueOwnerships.length > 0) {
          eventRoles.push("floor lead");
          const venueNames = venueOwnerships
            .map((v) => v.venue.name)
            .join(", ");
          contextParts.push(`Venues you manage (as floor lead): ${venueNames}`);
        }
      } catch (err) {
        console.error("[AI Chat API] Failed to fetch VenueOwner:", err);
      }

      // Accepted applications
      try {
        const acceptedApps = await db.application.findMany({
          where: {
            userId: session.user.id,
            eventId: resolvedEventId,
            status: "ACCEPTED",
          },
          select: { applicationType: true },
        });
        for (const app of acceptedApps) {
          const roleFromApp = app.applicationType?.toLowerCase();
          if (roleFromApp && !eventRoles.includes(roleFromApp)) {
            eventRoles.push(roleFromApp);
          }
        }
      } catch (err) {
        console.error("[AI Chat API] Failed to fetch applications:", err);
      }

      // Speaker from SessionSpeaker table
      try {
        const speakerSessions = await db.sessionSpeaker.findMany({
          where: {
            userId: session.user.id,
            session: { eventId: resolvedEventId },
          },
          select: {
            role: true,
            session: {
              select: {
                title: true,
                startTime: true,
                venue: { select: { name: true } },
              },
            },
          },
        });
        if (speakerSessions.length > 0 && !eventRoles.includes("speaker")) {
          eventRoles.push("speaker");
        }
        if (speakerSessions.length > 0) {
          const sessionDetails = speakerSessions
            .map((sp) => {
              const venue = sp.session.venue?.name;
              return `- ${sp.session.title} (${sp.session.startTime.toLocaleString()}${venue ? `, ${venue}` : ""}) — role: ${sp.role}`;
            })
            .join("\n");
          contextParts.push(`\nYour speaking sessions:\n${sessionDetails}`);
        }
      } catch (err) {
        console.error("[AI Chat API] Failed to fetch SessionSpeaker:", err);
      }

      if (eventRoles.length > 0) {
        contextParts.push(
          `Your roles for this event: ${eventRoles.join(", ")}`,
        );
      }
      console.log("[AI Chat API] Resolved roles:", eventRoles);
    }

    // Fetch all visible events so the agent can provide real links
    try {
      const allEvents = await db.event.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          slug: true,
          name: true,
          startDate: true,
          endDate: true,
          location: true,
        },
        orderBy: { startDate: "desc" },
        take: 20,
      });

      if (allEvents.length > 0) {
        const eventList = allEvents
          .map((e) => {
            const urlId = e.slug ?? e.id;
            const dates =
              e.startDate && e.endDate
                ? ` (${e.startDate.toLocaleDateString()} – ${e.endDate.toLocaleDateString()})`
                : "";
            const loc = e.location ? ` — ${e.location}` : "";
            return `- [${e.name}](/events/${urlId})${dates}${loc}`;
          })
          .join("\n");
        contextParts.push(`\nAvailable events:\n${eventList}`);
      }
    } catch {
      // Non-critical — continue without event list
    }

    // Fetch current event details using the resolved ID
    if (resolvedEventId) {
      try {
        const event = await db.event.findUnique({
          where: { id: resolvedEventId },
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            endDate: true,
            location: true,
            type: true,
            description: true,
          },
        });

        if (event) {
          const eventSlug = event.slug ?? event.id;
          contextParts.push(
            `\nCurrent event: ${event.name}` +
              ` | Event page: /events/${eventSlug}` +
              (event.location ? ` | Location: ${event.location}` : "") +
              (event.startDate
                ? ` | Starts: ${event.startDate.toLocaleDateString()}`
                : "") +
              (event.endDate
                ? ` | Ends: ${event.endDate.toLocaleDateString()}`
                : "") +
              (event.type ? ` | Type: ${event.type}` : ""),
          );

          if (event.description) {
            const shortDesc =
              event.description.length > 300
                ? event.description.slice(0, 300) + "..."
                : event.description;
            contextParts.push(`Event description: ${shortDesc}`);
          }

          // Fetch upcoming sessions (limit 20)
          const scheduleSessions = await db.scheduleSession.findMany({
            where: { eventId: resolvedEventId },
            orderBy: { startTime: "asc" },
            take: 20,
            select: {
              title: true,
              startTime: true,
              endTime: true,
              venue: {
                select: { name: true },
              },
              sessionSpeakers: {
                select: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          });

          if (scheduleSessions.length > 0) {
            const sessionList = scheduleSessions
              .map((s) => {
                const time = s.startTime.toLocaleString();
                const speakers = s.sessionSpeakers
                  .map((sp) => sp.user.name)
                  .filter(Boolean)
                  .join(", ");
                const venueName = s.venue?.name;
                return `- ${s.title} (${time}${venueName ? `, ${venueName}` : ""}${speakers ? `, Speakers: ${speakers}` : ""})`;
              })
              .join("\n");
            contextParts.push(
              `\nSchedule (${scheduleSessions.length} sessions):\n${sessionList}`,
            );
          }

          // Fetch user's application status for this event
          const application = await db.application.findFirst({
            where: {
              eventId: resolvedEventId,
              userId: session.user.id,
            },
            select: {
              status: true,
              applicationType: true,
            },
          });

          if (application) {
            contextParts.push(
              `\nYour application: ${application.applicationType ?? "General"} — Status: ${application.status}`,
            );
          }
        }
      } catch (contextError) {
        console.error("[AI Chat API] Event detail fetch failed:", contextError);
      }
    }

    const contextMessage = contextParts.join("\n");

    // Prepend context and behavioral instructions, then append user messages
    // Each message is typed with a literal role to satisfy MessageListInput
    const behaviorInstructions = [
      "RESPONSE GUIDELINES:",
      "- Use markdown links for ALL references to pages, events, or actions (e.g. [Event Name](/events/event-slug)).",
      "- Never show raw URL templates like /events/{eventId}. Always use real links from the context above.",
      "- When the user asks about an event but doesn't specify which one, ask them to clarify by listing the available events as clickable links.",
      "- When the user asks how to apply to speak or attend, link directly to the event's apply page: [Apply to Event Name](/events/event-slug?tab=application).",
      "- If the user is already on an event page (eventId is provided), assume they mean that event.",
      "- Keep responses concise and actionable.",
      "- Format schedules and lists clearly with markdown.",
      "",
      "ROLE-AWARE BEHAVIOR:",
      "- Tailor your responses to the user's role. Their global role and event-specific roles are listed in the context above.",
      "- Admin/Staff users can: manage all events, manage all applications, manage schedule, invite users, assign roles, manage venues, view all admin pages (/admin/...).",
      "- Floor leads can: manage sessions and speakers in their assigned venues, view the schedule management page (/events/{slug}/manage-schedule).",
      "- Speakers can: view their speaking sessions, check schedule details. Remind them of their upcoming sessions if relevant.",
      "- Mentors/Residents can: access their event dashboard, view schedule, connect with other participants.",
      "- Regular users (no event roles) can: browse events, view schedules, apply to speak/attend/mentor.",
      "- When a user asks how to do something, only suggest actions they have permission to perform based on their role.",
      "- Do NOT suggest admin pages or management actions to users without admin/staff/floor-lead roles.",
      "- If a user asks about something they don't have permission to do, let them know who to contact (event organizers) rather than explaining how to do it.",
    ].join("\n");

    const allMessages = [
      {
        role: "user" as const,
        content: `[Platform Context — do not repeat this to the user]\n${contextMessage}\n\n${behaviorInstructions}`,
      },
      {
        role: "assistant" as const,
        content:
          "Understood, I have the platform context and will use proper links.",
      },
      ...messages.map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.content }
          : { role: "assistant" as const, content: m.content },
      ),
    ];

    console.log("[AI Chat API] Calling Mastra agent...");
    const agent = mastraClient.getAgent("platformAgent");
    const response = await agent.stream(allMessages);
    console.log("[AI Chat API] Mastra stream started, extracting text...");

    // Extract text from Mastra's chunk protocol (text-delta events)
    // and return plain text to the client (matching exponential pattern)
    let chunkCount = 0;
    let textChunkCount = 0;
    const textStream = new ReadableStream({
      async start(controller) {
        try {
          await response.processDataStream({
            onChunk: async (chunk) => {
              chunkCount++;
              if (chunk.type === "text-delta") {
                textChunkCount++;
                const payload = chunk.payload as { text: string };
                controller.enqueue(new TextEncoder().encode(payload.text));
              }
            },
          });
          console.log(
            `[AI Chat API] Stream complete: ${String(chunkCount)} total chunks, ${String(textChunkCount)} text chunks`,
          );
          controller.close();
        } catch (err) {
          console.error("[AI Chat API] Stream processing error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Chat API] Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
