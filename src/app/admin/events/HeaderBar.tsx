import { Group, Paper } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { UserDropdownMenu } from "~/app/_components/UserDropdownMenu";
import AdminNavigation from "./AdminNavigation";
import MainNavigation from "~/app/_components/MainNavigation";

interface AcceptedEvent {
  id: string;
  name: string;
  slug: string | null;
}

export default async function HeaderBar() {
  const session = await auth();

  // Get all events the user has access to (accepted applications or mentor roles)
  let acceptedEvents: AcceptedEvent[] = [];

  if (session?.user) {
    const isAdmin =
      session.user.role === "admin" || session.user.role === "staff";

    // Query all accepted applications
    const acceptedApplications = await db.application.findMany({
      where: {
        userId: session.user.id,
        status: "ACCEPTED",
      },
      select: {
        eventId: true,
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Query all mentor roles
    const mentorRoles = await db.userRole.findMany({
      where: {
        userId: session.user.id,
        role: {
          name: "mentor",
        },
      },
      select: {
        eventId: true,
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Query all speaker roles
    const speakerRoles = await db.userRole.findMany({
      where: {
        userId: session.user.id,
        role: {
          name: "speaker",
        },
      },
      select: {
        eventId: true,
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Query all floor lead (venue owner) assignments
    const floorManagerEvents = await db.venueOwner.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        eventId: true,
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      distinct: ["eventId"],
    });

    // Combine and deduplicate events
    const eventMap = new Map<string, AcceptedEvent>();

    for (const app of acceptedApplications) {
      eventMap.set(app.event.id, {
        id: app.event.id,
        name: app.event.name,
        slug: app.event.slug,
      });
    }

    for (const role of mentorRoles) {
      eventMap.set(role.event.id, {
        id: role.event.id,
        name: role.event.name,
        slug: role.event.slug,
      });
    }

    for (const role of speakerRoles) {
      eventMap.set(role.event.id, {
        id: role.event.id,
        name: role.event.name,
        slug: role.event.slug,
      });
    }

    for (const vo of floorManagerEvents) {
      eventMap.set(vo.event.id, {
        id: vo.event.id,
        name: vo.event.name,
        slug: vo.event.slug,
      });
    }

    acceptedEvents = Array.from(eventMap.values());

    // Admins: if no events found via roles, show all active events
    if (isAdmin && acceptedEvents.length === 0) {
      const allEvents = await db.event.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, slug: true },
      });
      acceptedEvents = allEvents;
    }
  }

  return (
    <div>
      <Paper withBorder radius={0} className="px-8 py-4 shadow-sm">
        <Group justify="space-between" align="center">
          <Group align="center" gap={8}>
            <Link href="/" className="flex items-center cursor-pointer">
              <Image
                src="/images/ftc-logo.avif"
                alt="FtC"
                width={100}
                height={100}
              />
            </Link>
          </Group>

          <Group gap={16}>
            {session?.user && <UserDropdownMenu session={session} />}
          </Group>
        </Group>
      </Paper>

      {/* Navigation - Show appropriate menu based on user role */}
      {session?.user && (
        <>
          {session.user.role === "admin" || session.user.role === "staff" ? (
            <AdminNavigation acceptedEvents={acceptedEvents} />
          ) : (
            <MainNavigation acceptedEvents={acceptedEvents} />
          )}
        </>
      )}
    </div>
  );
}
