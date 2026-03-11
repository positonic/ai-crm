#!/usr/bin/env tsx

/**
 * Social Profile Migration Script
 *
 * Syncs social profile links from ApplicationResponse to UserProfile
 *
 * This script:
 * 1. Finds all ApplicationResponses with social profile answers (twitter, github, linkedin, telegram)
 * 2. Cleans and validates URLs (fixes duplicate prefixes, @ symbols, wrong domains)
 * 3. Gets corresponding UserProfile (creates if doesn't exist)
 * 4. Updates ONLY empty social profile fields (preserves existing data)
 *
 * URL Cleaning Features:
 * - Fixes duplicate URL prefixes: https://x.com/https://x.com/username → https://x.com/username
 * - Removes @ symbols: https://x.com/@username → https://x.com/username
 * - Validates domain correctness (rejects wrong domains like github.com/linkedin.com/...)
 * - Adds missing https:// prefix
 * - Extracts handles from t.me links for Telegram
 *
 * Usage:
 *   bun run scripts/migrate-social-profiles.ts                # Dry run (preview only)
 *   bun run scripts/migrate-social-profiles.ts --execute      # Actually migrate data
 *   bun run scripts/migrate-social-profiles.ts --event-id <id>  # Specific event only
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Command line options
const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const EVENT_ID = args.includes("--event-id")
  ? args[args.indexOf("--event-id") + 1]
  : undefined;

/**
 * Clean and validate a social profile URL
 * Fixes common issues like:
 * - Duplicate URL prefixes: https://x.com/https://x.com/username
 * - Wrong domain in URL: https://github.com/https://www.linkedin.com/...
 * - @ symbols: https://x.com/@username
 * - Missing https://
 */
function cleanSocialUrl(
  value: string,
  platform: "twitter" | "github" | "linkedin" | "telegram",
): string | null {
  if (!value?.trim()) return null;

  let cleaned = value.trim();

  // Remove @ symbols from the beginning
  cleaned = cleaned.replace(/^@+/, "");

  // Fix duplicate URL prefixes (e.g., https://x.com/https://x.com/username)
  // Extract the correct URL from duplicates
  if (platform === "twitter") {
    // Fix: https://x.com/https://x.com/username → https://x.com/username
    const twitterMatch =
      /https?:\/\/(x\.com|twitter\.com)\/https?:\/\/(x\.com|twitter\.com)\/(.+)/.exec(
        cleaned,
      );
    if (twitterMatch) {
      cleaned = `https://x.com/${twitterMatch[3]}`;
    }
    // Remove @ symbols
    cleaned = cleaned.replace(
      /https?:\/\/(x\.com|twitter\.com)\/@/,
      "https://x.com/",
    );
  } else if (platform === "github") {
    // Fix: https://github.com/https://github.com/username → https://github.com/username
    // Fix: https://github.com/https://www.linkedin.com/... → reject (invalid)
    const githubMatch =
      /https?:\/\/github\.com\/https?:\/\/github\.com\/(.+)/.exec(cleaned);
    if (githubMatch) {
      cleaned = `https://github.com/${githubMatch[1]}`;
    } else if (cleaned.includes("github.com/https://")) {
      // Wrong domain embedded - reject
      return null;
    }
    // Remove @ symbols
    cleaned = cleaned.replace(
      /https?:\/\/github\.com\/@/,
      "https://github.com/",
    );
  } else if (platform === "linkedin") {
    // Fix: https://linkedin.com/in/https://linkedin.com/in/username → https://linkedin.com/in/username
    // Fix: https://linkedin.com/in/https://www.linkedin.com/in/username → https://linkedin.com/in/username
    const linkedinMatch =
      /https?:\/\/(www\.)?linkedin\.com\/in\/https?:\/\/(www\.)?linkedin\.com\/in\/(.+)/.exec(
        cleaned,
      );
    if (linkedinMatch) {
      cleaned = `https://linkedin.com/in/${linkedinMatch[3]}`;
    } else if (cleaned.includes("linkedin.com/in/https://")) {
      // Wrong domain embedded - reject
      return null;
    }
    // Remove @ symbols
    cleaned = cleaned.replace(
      /https?:\/\/(www\.)?linkedin\.com\/in\/@/,
      "https://linkedin.com/in/",
    );
  }

  // For telegram, if it's a phone number or just a handle, keep as-is
  if (platform === "telegram") {
    // If it's a phone number, keep it
    if (/^\+?\d+/.test(cleaned)) return cleaned;
    // If it's a t.me link, extract the handle
    if (cleaned.includes("t.me/")) {
      const match = /t\.me\/([^\/\s]+)/.exec(cleaned);
      if (match?.[1]) return match[1];
    }
    // Remove @ if present
    return cleaned.replace(/^@+/, "");
  }

  // Validate final URL format for non-telegram platforms
  // Check if it looks like a valid URL
  const urlPattern = /^https?:\/\//;
  if (!urlPattern.test(cleaned)) {
    // Try to construct a valid URL
    if (platform === "twitter") {
      cleaned = `https://x.com/${cleaned}`;
    } else if (platform === "github") {
      cleaned = `https://github.com/${cleaned}`;
    } else if (platform === "linkedin") {
      cleaned = `https://linkedin.com/in/${cleaned}`;
    }
  }

  // Final validation - must be a reasonable URL
  try {
    const url = new URL(cleaned);
    const validDomains: Record<string, string[]> = {
      twitter: ["x.com", "twitter.com"],
      github: ["github.com"],
      linkedin: ["linkedin.com", "www.linkedin.com"],
    };

    if (!validDomains[platform]?.some((domain) => url.hostname === domain)) {
      console.log(
        `   ⚠️  Invalid domain for ${platform}: ${url.hostname} (from: ${value})`,
      );
      return null;
    }

    return cleaned;
  } catch {
    console.log(
      `   ⚠️  Invalid URL for ${platform}: ${cleaned} (from: ${value})`,
    );
    return null;
  }
}

interface MigrationStats {
  usersProcessed: number;
  profilesCreated: number;
  profilesUpdated: number;
  fieldsUpdated: {
    twitter: number;
    github: number;
    linkedin: number;
    telegram: number;
  };
  skippedExisting: number;
  skippedEmpty: number;
  errors: number;
}

interface UserSocialProfiles {
  userId: string;
  userName: string | null;
  twitter: string | null;
  github: string | null;
  linkedin: string | null;
  telegram: string | null;
  applicationId: string;
  eventName: string;
  applicationDate: Date;
  status: string;
}

async function collectData(): Promise<UserSocialProfiles[]> {
  console.log("📊 Collecting social profiles from applications...\n");

  // Find all social profile responses
  const socialResponses = await prisma.applicationResponse.findMany({
    where: {
      question: {
        questionKey: {
          in: ["twitter", "github", "linkedin", "telegram"],
        },
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
      question: {
        select: {
          questionKey: true,
        },
      },
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

  // Group by user
  const userProfiles = new Map<string, UserSocialProfiles>();

  for (const response of socialResponses) {
    const { application, question } = response;

    if (!application.userId) {
      console.log(`⚠️  Skipping response ${response.id}: no userId`);
      continue;
    }

    const userId = application.userId;

    // Get or create user entry
    if (!userProfiles.has(userId)) {
      userProfiles.set(userId, {
        userId: userId,
        userName: application.user?.name ?? null,
        twitter: null,
        github: null,
        linkedin: null,
        telegram: null,
        applicationId: application.id,
        eventName: application.event.name,
        applicationDate: application.createdAt,
        status: application.status,
      });
    }

    const userProfile = userProfiles.get(userId)!;

    // Set the appropriate field based on question key
    const answer = response.answer.trim();
    if (!answer) continue;

    // Clean and validate the URL before storing
    let cleanedValue: string | null = null;
    switch (question.questionKey) {
      case "twitter":
        cleanedValue = cleanSocialUrl(answer, "twitter");
        if (cleanedValue) userProfile.twitter = cleanedValue;
        break;
      case "github":
        cleanedValue = cleanSocialUrl(answer, "github");
        if (cleanedValue) userProfile.github = cleanedValue;
        break;
      case "linkedin":
        cleanedValue = cleanSocialUrl(answer, "linkedin");
        if (cleanedValue) userProfile.linkedin = cleanedValue;
        break;
      case "telegram":
        cleanedValue = cleanSocialUrl(answer, "telegram");
        if (cleanedValue) userProfile.telegram = cleanedValue;
        break;
    }
  }

  return Array.from(userProfiles.values());
}

async function migrateUserSocialProfiles(
  userProfiles: UserSocialProfiles,
  stats: MigrationStats,
): Promise<void> {
  const { userId, userName } = userProfiles;

  console.log(`\n👤 User: ${userName ?? userId}`);
  console.log(
    `   Application: ${userProfiles.applicationDate.toISOString().split("T")[0]}`,
  );
  console.log(`   Status: ${userProfiles.status}`);

  // Display what we found
  const foundFields: string[] = [];
  if (userProfiles.twitter)
    foundFields.push(`Twitter: ${userProfiles.twitter}`);
  if (userProfiles.github) foundFields.push(`GitHub: ${userProfiles.github}`);
  if (userProfiles.linkedin)
    foundFields.push(`LinkedIn: ${userProfiles.linkedin}`);
  if (userProfiles.telegram)
    foundFields.push(`Telegram: ${userProfiles.telegram}`);

  if (foundFields.length === 0) {
    console.log(`   ⚠️  No social profiles found`);
    stats.skippedEmpty++;
    return;
  }

  console.log(`   Found: ${foundFields.join(", ")}`);
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

    // Prepare update data - only update fields that are currently empty
    const updateData: {
      twitterUrl?: string;
      githubUrl?: string;
      linkedinUrl?: string;
      telegramHandle?: string;
    } = {};

    let hasUpdates = false;
    let skipped = false;

    // Check each field - only copy if destination is empty
    if (userProfiles.twitter) {
      if (profile?.twitterUrl) {
        console.log(`   ⚠️  Twitter already set, skipping`);
        skipped = true;
      } else {
        updateData.twitterUrl = userProfiles.twitter;
        console.log(`   ✓ Setting Twitter: ${userProfiles.twitter}`);
        stats.fieldsUpdated.twitter++;
        hasUpdates = true;
      }
    }

    if (userProfiles.github) {
      if (profile?.githubUrl) {
        console.log(`   ⚠️  GitHub already set, skipping`);
        skipped = true;
      } else {
        updateData.githubUrl = userProfiles.github;
        console.log(`   ✓ Setting GitHub: ${userProfiles.github}`);
        stats.fieldsUpdated.github++;
        hasUpdates = true;
      }
    }

    if (userProfiles.linkedin) {
      if (profile?.linkedinUrl) {
        console.log(`   ⚠️  LinkedIn already set, skipping`);
        skipped = true;
      } else {
        updateData.linkedinUrl = userProfiles.linkedin;
        console.log(`   ✓ Setting LinkedIn: ${userProfiles.linkedin}`);
        stats.fieldsUpdated.linkedin++;
        hasUpdates = true;
      }
    }

    if (userProfiles.telegram) {
      if (profile?.telegramHandle) {
        console.log(`   ⚠️  Telegram already set, skipping`);
        skipped = true;
      } else {
        updateData.telegramHandle = userProfiles.telegram;
        console.log(`   ✓ Setting Telegram: ${userProfiles.telegram}`);
        stats.fieldsUpdated.telegram++;
        hasUpdates = true;
      }
    }

    // Apply updates
    if (hasUpdates && !DRY_RUN) {
      await prisma.userProfile.update({
        where: { userId: userId },
        data: updateData,
      });
      stats.profilesUpdated++;
    } else if (hasUpdates) {
      stats.profilesUpdated++;
    }

    if (skipped) {
      stats.skippedExisting++;
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
    fieldsUpdated: {
      twitter: 0,
      github: 0,
      linkedin: 0,
      telegram: 0,
    },
    skippedExisting: 0,
    skippedEmpty: 0,
    errors: 0,
  };

  console.log("🔄 Social Profile Migration");
  console.log("═══════════════════════════════════════\n");

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No changes will be made");
    console.log("   Use --execute flag to actually migrate data\n");
  } else {
    console.log("🚀 EXECUTE MODE - Changes will be saved to database\n");
  }

  console.log(
    "🛡️  SAFE MODE - Will only copy to empty fields (skips existing data)\n",
  );
  console.log("🧹 URL CLEANING - Validates and fixes malformed URLs\n");

  if (EVENT_ID) {
    console.log(`📅 Filtering by event ID: ${EVENT_ID}\n`);
  }

  try {
    // Collect all data first
    const userProfiles = await collectData();

    console.log(
      `\nFound ${userProfiles.length} users with social profile data\n`,
    );
    console.log("─────────────────────────────────────────\n");

    if (userProfiles.length === 0) {
      console.log("✅ No social profile data to migrate\n");
      return;
    }

    // Process each user
    for (const userProfile of userProfiles) {
      await migrateUserSocialProfiles(userProfile, stats);
    }

    // Print summary
    console.log("\n");
    console.log("═══════════════════════════════════════");
    console.log("📊 MIGRATION SUMMARY");
    console.log("═══════════════════════════════════════\n");
    console.log(`Users processed:        ${stats.usersProcessed}`);
    console.log(`Profiles created:       ${stats.profilesCreated}`);
    console.log(`Profiles updated:       ${stats.profilesUpdated}`);
    console.log(`\nFields updated:`);
    console.log(`  Twitter:              ${stats.fieldsUpdated.twitter}`);
    console.log(`  GitHub:               ${stats.fieldsUpdated.github}`);
    console.log(`  LinkedIn:             ${stats.fieldsUpdated.linkedin}`);
    console.log(`  Telegram:             ${stats.fieldsUpdated.telegram}`);
    console.log(`\nSkipped (existing):     ${stats.skippedExisting}`);
    console.log(`Skipped (empty):        ${stats.skippedEmpty}`);
    console.log(`Errors:                 ${stats.errors}`);
    console.log("");

    if (DRY_RUN) {
      console.log("⚠️  This was a DRY RUN - no changes were made");
      console.log("   Run with --execute flag to apply changes\n");
    } else {
      console.log("✅ Migration completed successfully!\n");

      // Run verification query
      const totalWithSocial = await prisma.userProfile.count({
        where: {
          OR: [
            { twitterUrl: { not: null } },
            { githubUrl: { not: null } },
            { linkedinUrl: { not: null } },
            { telegramHandle: { not: null } },
          ],
        },
      });
      console.log(
        `✓ Verified: ${totalWithSocial} profiles now have social links\n`,
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
