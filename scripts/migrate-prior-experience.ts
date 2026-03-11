#!/usr/bin/env tsx

/**
 * Prior Experience Migration Script
 *
 * Syncs prior experience descriptions from ApplicationResponse to UserProfile.priorExperience
 *
 * This script:
 * 1. Finds all ApplicationResponses with prior_experience answers
 * 2. Gets corresponding UserProfile (creates if doesn't exist)
 * 3. Updates priorExperience field with experience text
 * 4. Sets metadata fields (skillsSource, skillsSyncedAt)
 * 5. Handles conflicts (existing data) based on flags
 *
 * Usage:
 *   bun run scripts/migrate-prior-experience.ts                # Dry run (preview only)
 *   bun run scripts/migrate-prior-experience.ts --execute      # Actually migrate data
 *   bun run scripts/migrate-prior-experience.ts --overwrite    # Replace existing data
 *   bun run scripts/migrate-prior-experience.ts --append       # Append to existing data
 *   bun run scripts/migrate-prior-experience.ts --event-id <id>  # Specific event only
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Command line options
const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const OVERWRITE = args.includes("--overwrite");
const APPEND = args.includes("--append");
const EVENT_ID = args.includes("--event-id")
  ? args[args.indexOf("--event-id") + 1]
  : undefined;

interface MigrationStats {
  usersProcessed: number;
  profilesCreated: number;
  profilesUpdated: number;
  skippedExisting: number;
  skippedEmpty: number;
  errors: number;
}

interface UserExperience {
  userId: string;
  userName: string | null;
  experienceText: string;
  applicationId: string;
  eventName: string;
  applicationDate: Date;
  status: string;
}

async function collectData(): Promise<UserExperience[]> {
  console.log("📊 Collecting prior experience from applications...\n");

  // Find all prior_experience responses
  const experienceResponses = await prisma.applicationResponse.findMany({
    where: {
      question: {
        questionKey: "prior_experience",
      },
      answer: {
        not: "",
      },
      ...(EVENT_ID && {
        application: {
          eventId: EVENT_ID,
        },
      }),
    },
    include: {
      application: {
        include: {
          event: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      application: {
        createdAt: "desc",
      },
    },
  });

  const userExperiences: UserExperience[] = [];
  const seenUsers = new Set<string>();

  for (const experienceResponse of experienceResponses) {
    const { application } = experienceResponse;

    if (!application.userId) {
      console.log(`⚠️  Skipping response ${experienceResponse.id}: no userId`);
      continue;
    }

    // Use most recent application per user
    if (seenUsers.has(application.userId)) {
      continue;
    }
    seenUsers.add(application.userId);

    // Skip empty or whitespace-only text
    const text = experienceResponse.answer.trim();
    if (!text) {
      continue;
    }

    userExperiences.push({
      userId: application.userId,
      userName: application.user?.name ?? null,
      experienceText: text,
      applicationId: application.id,
      eventName: application.event.name,
      applicationDate: application.createdAt,
      status: application.status,
    });
  }

  return userExperiences;
}

async function migrateUserExperience(
  userExp: UserExperience,
  stats: MigrationStats,
): Promise<void> {
  const { userId, userName, experienceText } = userExp;

  console.log(`\n👤 User: ${userName ?? userId}`);
  console.log(
    `   Application: ${userExp.applicationDate.toISOString().split("T")[0]}`,
  );
  console.log(`   Status: ${userExp.status}`);
  console.log(`   Experience Length: ${experienceText.length} characters`);
  console.log(
    `   Preview: "${experienceText.substring(0, 100)}${experienceText.length > 100 ? "..." : ""}"`,
  );
  console.log(`   Actions:`);

  try {
    // Check if user has a profile
    let profile = await prisma.userProfile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      // Create new profile
      if (!DRY_RUN) {
        profile = await prisma.userProfile.create({
          data: {
            userId: userId,
          },
        });
      }
      console.log(`   ✓ Created new profile`);
      stats.profilesCreated++;
    } else {
      console.log(`   ✓ Profile exists`);
    }

    // Check for existing prior experience
    const existingExp = profile?.priorExperience?.trim();

    if (existingExp) {
      console.log(
        `   ⚠️  Already has priorExperience (${existingExp.length} chars)`,
      );

      // Check if it's the same content
      if (existingExp === experienceText) {
        console.log(`   ⚠️  SKIP (identical content)`);
        stats.skippedExisting++;
        return;
      }

      // Handle based on flags
      if (OVERWRITE) {
        if (!DRY_RUN) {
          await prisma.userProfile.update({
            where: { userId: userId },
            data: {
              priorExperience: experienceText,
              skillsSource: "application",
              skillsSyncedAt: new Date(),
            },
          });
        }
        console.log(`   ✓ OVERWROTE existing experience`);
        stats.profilesUpdated++;
      } else if (APPEND) {
        const combined = `${existingExp}\n\n---\n\n${experienceText}`;
        if (!DRY_RUN) {
          await prisma.userProfile.update({
            where: { userId: userId },
            data: {
              priorExperience: combined,
              skillsSource: "application",
              skillsSyncedAt: new Date(),
            },
          });
        }
        console.log(`   ✓ APPENDED to existing experience`);
        stats.profilesUpdated++;
      } else {
        console.log(`   ⚠️  SKIP (use --overwrite or --append to update)`);
        stats.skippedExisting++;
      }
    } else {
      // No existing experience - safe to set
      if (!DRY_RUN) {
        await prisma.userProfile.update({
          where: { userId: userId },
          data: {
            priorExperience: experienceText,
            skillsSource: "application",
            skillsSyncedAt: new Date(),
          },
        });
      }
      console.log(`   ✓ Set priorExperience (${experienceText.length} chars)`);
      console.log(`   ✓ Set skillsSource = 'application'`);
      console.log(`   ✓ Set skillsSyncedAt = ${new Date().toISOString()}`);
      stats.profilesUpdated++;
    }

    stats.usersProcessed++;
  } catch (error) {
    console.log(
      `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    stats.errors++;
  }
}

async function main() {
  const stats: MigrationStats = {
    usersProcessed: 0,
    profilesCreated: 0,
    profilesUpdated: 0,
    skippedExisting: 0,
    skippedEmpty: 0,
    errors: 0,
  };

  console.log("🔄 Prior Experience Migration");
  console.log("═══════════════════════════════════════\n");

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No changes will be made");
    console.log("   Use --execute flag to actually migrate data\n");
  } else {
    console.log("🚀 EXECUTE MODE - Changes will be saved to database\n");
  }

  if (OVERWRITE) {
    console.log(
      "⚠️  OVERWRITE MODE - Will replace existing priorExperience data\n",
    );
  } else if (APPEND) {
    console.log(
      "📝 APPEND MODE - Will append to existing priorExperience data\n",
    );
  } else {
    console.log(
      "🛡️  SAFE MODE - Will skip users with existing priorExperience\n",
    );
  }

  if (EVENT_ID) {
    console.log(`📅 Filtering by event ID: ${EVENT_ID}\n`);
  }

  try {
    // Collect all data first
    const userExperiences = await collectData();

    console.log(
      `\nFound ${userExperiences.length} users with prior experience\n`,
    );
    console.log("─────────────────────────────────────────\n");

    if (userExperiences.length === 0) {
      console.log("✅ No experience data to migrate\n");
      return;
    }

    // Process each user
    for (const userExp of userExperiences) {
      await migrateUserExperience(userExp, stats);
    }

    // Print summary
    console.log("\n");
    console.log("═══════════════════════════════════════");
    console.log("📊 MIGRATION SUMMARY");
    console.log("═══════════════════════════════════════\n");
    console.log(`Users processed:        ${stats.usersProcessed}`);
    console.log(`Profiles created:       ${stats.profilesCreated}`);
    console.log(`Profiles updated:       ${stats.profilesUpdated}`);
    console.log(`Skipped (existing):     ${stats.skippedExisting}`);
    console.log(`Skipped (empty):        ${stats.skippedEmpty}`);
    console.log(`Errors:                 ${stats.errors}`);
    console.log("");

    if (DRY_RUN) {
      console.log("⚠️  This was a DRY RUN - no changes were made");
      console.log("   Run with --execute flag to apply changes\n");
    } else {
      console.log("✅ Migration completed successfully!\n");

      // Run verification query
      const totalWithExp = await prisma.userProfile.count({
        where: { priorExperience: { not: null } },
      });
      console.log(
        `✓ Verified: ${totalWithExp} profiles now have prior experience\n`,
      );
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
