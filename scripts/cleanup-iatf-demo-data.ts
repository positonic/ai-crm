/**
 * One-time cleanup script: Remove demo data seeded by seed-demo-schedule.ts
 * from the intelligence-at-the-frontier event.
 *
 * This removes:
 *   - SessionSpeaker records for demo sessions
 *   - ScheduleSession records (all sessions for the event)
 *   - ScheduleSessionType records (6 demo types)
 *   - ScheduleTrack records (4 demo tracks)
 *   - ScheduleVenue records created by seed-demo-schedule.ts (6 demo venues)
 *     (preserves the 9 real floor venues from update-floors.ts)
 *   - User + UserProfile records for @demo.example speakers
 *
 * Usage:
 *   bunx tsx scripts/cleanup-iatf-demo-data.ts              # Dry run (default)
 *   bunx tsx scripts/cleanup-iatf-demo-data.ts --execute     # Actually delete
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes("--execute");
const EVENT_SLUG = "intelligence-at-the-frontier";

// Venues created by seed-demo-schedule.ts (NOT the real floor venues)
const DEMO_VENUE_NAMES = [
  "Bread Cube",
  "Einkeller",
  "DWeb Terrace",
  "Canopy",
  "Design Space",
  "Workshop Cube",
];

async function main() {
  if (DRY_RUN) {
    console.log("=== DRY RUN (pass --execute to actually delete) ===\n");
  } else {
    console.log("=== EXECUTING CLEANUP ===\n");
  }

  // 1. Find the event
  const event = await prisma.event.findFirst({
    where: { slug: EVENT_SLUG },
  });

  if (!event) {
    console.error(`Event with slug "${EVENT_SLUG}" not found.`);
    process.exit(1);
  }

  console.log(`Target event: ${event.name} (${event.id})\n`);

  // 2. Find all sessions for this event
  const sessions = await prisma.scheduleSession.findMany({
    where: { eventId: event.id },
    select: { id: true, title: true },
  });
  console.log(`Sessions to delete: ${sessions.length}`);

  // 3. Count SessionSpeaker records for those sessions
  const sessionIds = sessions.map((s) => s.id);
  const speakerCount = await prisma.sessionSpeaker.count({
    where: { sessionId: { in: sessionIds } },
  });
  console.log(`SessionSpeaker records to delete: ${speakerCount}`);

  // 4. Find demo session types
  const sessionTypes = await prisma.scheduleSessionType.findMany({
    where: { eventId: event.id },
    select: { id: true, name: true },
  });
  console.log(`Session types to delete: ${sessionTypes.length}`);

  // 5. Find demo tracks
  const tracks = await prisma.scheduleTrack.findMany({
    where: { eventId: event.id },
    select: { id: true, name: true },
  });
  console.log(`Tracks to delete: ${tracks.length}`);

  // 6. Find demo venues (only the 6 from seed-demo-schedule, NOT floor venues)
  const demoVenues = await prisma.scheduleVenue.findMany({
    where: {
      eventId: event.id,
      name: { in: DEMO_VENUE_NAMES },
    },
    select: { id: true, name: true },
  });
  console.log(
    `Demo venues to delete: ${demoVenues.length} (preserving floor venues)`,
  );

  // 7. Find all venues to show what's preserved
  const allVenues = await prisma.scheduleVenue.findMany({
    where: { eventId: event.id },
    select: { id: true, name: true },
  });
  const preservedVenues = allVenues.filter(
    (v) => !DEMO_VENUE_NAMES.includes(v.name),
  );
  console.log(`Venues preserved: ${preservedVenues.length}`);
  for (const v of preservedVenues) {
    console.log(`  - ${v.name}`);
  }

  // 8. Find @demo.example users (from seed-demo-schedule.ts)
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@demo.example" } },
    select: { id: true, email: true, firstName: true, surname: true },
  });
  console.log(`\n@demo.example users found: ${demoUsers.length}`);

  // Check which of these are linked to IATF sessions specifically
  const iatfSpeakerUsers = await prisma.sessionSpeaker.findMany({
    where: {
      sessionId: { in: sessionIds },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  const iatfSpeakerUserIds = new Set(iatfSpeakerUsers.map((s) => s.userId));

  // Separate demo users into IATF speakers vs example-conf users
  const iatfDemoUsers = demoUsers.filter((u) => iatfSpeakerUserIds.has(u.id));
  const otherDemoUsers = demoUsers.filter((u) => !iatfSpeakerUserIds.has(u.id));
  console.log(
    `  - IATF speakers (will check if safe to delete): ${iatfDemoUsers.length}`,
  );
  console.log(
    `  - Other demo users (example-conf, keep): ${otherDemoUsers.length}`,
  );

  // For IATF demo users, check if they have data in other events
  const usersToDelete: string[] = [];
  for (const user of iatfDemoUsers) {
    // Check for any connections to other events
    const otherSessionSpeakers = await prisma.sessionSpeaker.count({
      where: {
        userId: user.id,
        session: { eventId: { not: event.id } },
      },
    });
    const applications = await prisma.application.count({
      where: { userId: user.id },
    });
    const projects = await prisma.userProject.count({
      where: { profile: { userId: user.id } },
    });
    const askOffers = await prisma.askOffer.count({
      where: { userId: user.id },
    });
    const praise = await prisma.praise.count({
      where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
    });
    const forumThreads = await prisma.forumThread.count({
      where: { userId: user.id },
    });

    const totalOtherRefs =
      otherSessionSpeakers +
      applications +
      projects +
      askOffers +
      praise +
      forumThreads;

    if (totalOtherRefs === 0) {
      usersToDelete.push(user.id);
    } else {
      console.log(
        `  Keeping user ${user.email} — has ${totalOtherRefs} references in other features`,
      );
    }
  }
  console.log(`  Users safe to delete: ${usersToDelete.length}`);

  // 9. Check UserRole records for the event
  const eventUserRoles = await prisma.userRole.count({
    where: {
      eventId: event.id,
      userId: { in: usersToDelete },
    },
  });
  console.log(`UserRole records to delete: ${eventUserRoles}`);

  console.log("\n--- Summary ---");
  console.log(`SessionSpeaker: ${speakerCount}`);
  console.log(`ScheduleSession: ${sessions.length}`);
  console.log(`ScheduleSessionType: ${sessionTypes.length}`);
  console.log(`ScheduleTrack: ${tracks.length}`);
  console.log(`ScheduleVenue (demo only): ${demoVenues.length}`);
  console.log(`UserRole: ${eventUserRoles}`);
  console.log(`UserProfile: ${usersToDelete.length}`);
  console.log(`User: ${usersToDelete.length}`);

  if (DRY_RUN) {
    console.log("\n(Dry run — no changes made. Pass --execute to delete.)\n");
    return;
  }

  // === EXECUTE DELETIONS (order matters for FK constraints) ===
  console.log("\nDeleting...");

  // Delete SessionSpeaker records first
  const deletedSpeakers = await prisma.sessionSpeaker.deleteMany({
    where: { sessionId: { in: sessionIds } },
  });
  console.log(`  Deleted ${deletedSpeakers.count} SessionSpeaker records`);

  // Delete Sessions (must null out venueId, typeId, trackId FKs aren't cascade)
  const deletedSessions = await prisma.scheduleSession.deleteMany({
    where: { eventId: event.id },
  });
  console.log(`  Deleted ${deletedSessions.count} ScheduleSession records`);

  // Delete ScheduleRooms for demo venues
  const demoVenueIds = demoVenues.map((v) => v.id);
  const deletedRooms = await prisma.scheduleRoom.deleteMany({
    where: { venueId: { in: demoVenueIds } },
  });
  console.log(`  Deleted ${deletedRooms.count} ScheduleRoom records`);

  // Delete Session Types
  const deletedTypes = await prisma.scheduleSessionType.deleteMany({
    where: { eventId: event.id },
  });
  console.log(`  Deleted ${deletedTypes.count} ScheduleSessionType records`);

  // Delete Tracks
  const deletedTracks = await prisma.scheduleTrack.deleteMany({
    where: { eventId: event.id },
  });
  console.log(`  Deleted ${deletedTracks.count} ScheduleTrack records`);

  // Delete demo venues (NOT the floor venues)
  const deletedVenues = await prisma.scheduleVenue.deleteMany({
    where: {
      eventId: event.id,
      name: { in: DEMO_VENUE_NAMES },
    },
  });
  console.log(
    `  Deleted ${deletedVenues.count} ScheduleVenue records (demo only)`,
  );

  // Delete UserRole records for the event
  const deletedRoles = await prisma.userRole.deleteMany({
    where: {
      eventId: event.id,
      userId: { in: usersToDelete },
    },
  });
  console.log(`  Deleted ${deletedRoles.count} UserRole records`);

  // Delete UserProfiles for users being removed
  const deletedProfiles = await prisma.userProfile.deleteMany({
    where: { userId: { in: usersToDelete } },
  });
  console.log(`  Deleted ${deletedProfiles.count} UserProfile records`);

  // Delete Account records (OAuth etc.) for users being removed
  const deletedAccounts = await prisma.account.deleteMany({
    where: { userId: { in: usersToDelete } },
  });
  console.log(`  Deleted ${deletedAccounts.count} Account records`);

  // Delete Session records for users being removed
  const deletedUserSessions = await prisma.session.deleteMany({
    where: { userId: { in: usersToDelete } },
  });
  console.log(`  Deleted ${deletedUserSessions.count} Session records`);

  // Finally, delete the demo users
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: usersToDelete } },
  });
  console.log(`  Deleted ${deletedUsers.count} User records`);

  console.log("\nCleanup complete!");
  console.log(
    "Note: Floor venues (Floor 14, Floor 12, etc.) have been preserved.",
  );
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
