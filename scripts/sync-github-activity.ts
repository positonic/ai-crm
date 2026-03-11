/**
 * GitHub Activity Sync Script
 *
 * Fetches activity data for all project repositories and updates database
 *
 * Usage:
 *   bun run scripts/sync-github-activity.ts <eventId>
 *
 * Example:
 *   bun run scripts/sync-github-activity.ts funding-commons-residency-2025
 */

// Load environment variables from .env.local first, then .env
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { db } from "~/server/db";
import { GitHubService } from "~/server/services/github";
import { createEASService } from "~/server/services/eas";
import { env } from "~/env";
import type { Prisma } from "@prisma/client";

interface SyncResult {
  repositoryId: string;
  repositoryUrl: string;
  projectTitle: string;
  success: boolean;
  error?: string;
}

async function main() {
  const eventId = process.argv[2];

  if (!eventId) {
    console.error("❌ Error: Event ID is required");
    console.error("\nUsage:");
    console.error("  bun run scripts/sync-github-activity.ts <eventId>");
    console.error("\nExample:");
    console.error(
      "  bun run scripts/sync-github-activity.ts funding-commons-residency-2025",
    );
    process.exit(1);
  }

  if (!process.env.GITHUB_API_TOKEN) {
    console.error(
      "❌ Error: GITHUB_API_TOKEN environment variable is required",
    );
    console.error("   Add it to your .env.local file");
    process.exit(1);
  }

  console.log("🚀 GitHub Activity Sync Script");
  console.log("=".repeat(80));
  console.log(`\n📊 Syncing activity for event: ${eventId}...`);

  // Fetch event with residency dates
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!event) {
    console.error("❌ Event not found");
    process.exit(1);
  }

  console.log(`📅 Event: ${event.name}`);
  console.log(
    `   Period: ${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()}`,
  );

  // Get all repositories for this event's projects
  const repositories = await db.repository.findMany({
    where: {
      project: {
        profile: {
          user: {
            applications: {
              some: {
                eventId,
                status: "ACCEPTED",
                applicationType: "RESIDENT",
              },
            },
          },
        },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  console.log(`\n📦 Found ${repositories.length} repositories to sync\n`);

  if (repositories.length === 0) {
    console.log("⚠️  No repositories found for this event");
    await db.$disconnect();
    process.exit(0);
  }

  const github = new GitHubService();
  const results: SyncResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < repositories.length; i++) {
    const repo = repositories[i]!;
    const progress = `[${i + 1}/${repositories.length}]`;

    try {
      console.log(`${progress} 🔄 Syncing: ${repo.project.title}`);
      console.log(`   URL: ${repo.url}`);

      // Fetch lifetime activity
      const activity = await github.fetchRepositoryActivity(repo.url);

      console.log(
        `   📈 Lifetime: ${activity.totalCommits} commits, ${activity.isActive ? "✓ active" : "✗ inactive"}`,
      );

      // Update Repository model with lifetime metrics
      await db.repository.update({
        where: { id: repo.id },
        data: {
          lastCommitDate: activity.lastCommitDate,
          firstCommitDate: activity.firstCommitDate,
          totalCommits: activity.totalCommits,
          isActive: activity.isActive,
          weeksActive: activity.weeksActive,
          commitsData: activity.commitsData as unknown as Prisma.InputJsonValue,
          lastSyncedAt: new Date(),
        },
      });

      // Fetch residency-specific activity
      if (event.startDate && event.endDate) {
        const residencyActivity = await github.fetchResidencyActivity(
          repo.url,
          event.startDate,
          event.endDate,
        );

        console.log(
          `   🎯 Residency: ${residencyActivity.residencyCommits} commits`,
        );

        // Upsert residency metrics
        await db.repositoryResidencyMetrics.upsert({
          where: {
            repositoryId_eventId: {
              repositoryId: repo.id,
              eventId: event.id,
            },
          },
          create: {
            repositoryId: repo.id,
            eventId: event.id,
            commitsData:
              residencyActivity.commitsData as unknown as Prisma.InputJsonValue,
            residencyCommits: residencyActivity.residencyCommits,
            residencyStartDate: event.startDate,
            residencyEndDate: event.endDate,
            lastSyncedAt: new Date(),
          },
          update: {
            commitsData:
              residencyActivity.commitsData as unknown as Prisma.InputJsonValue,
            residencyCommits: residencyActivity.residencyCommits,
            residencyStartDate: event.startDate,
            residencyEndDate: event.endDate,
            lastSyncedAt: new Date(),
          },
        });

        // Create attestation if enabled
        if (env.EAS_ATTESTATIONS_ENABLED === "true") {
          // Validate required env vars before attempting
          if (!env.EAS_PRIVATE_KEY) {
            console.warn(
              `   ⚠ Attestations enabled but EAS_PRIVATE_KEY not set, skipping`,
            );
          } else if (!env.EAS_SCHEMA_UID) {
            console.warn(
              `   ⚠ Attestations enabled but EAS_SCHEMA_UID not set, skipping`,
            );
          } else {
            try {
              const easService = createEASService();
              easService.setSchemaUid(env.EAS_SCHEMA_UID);

              const attestation = await easService.createAttestation({
                projectId: repo.project.id,
                repositoryId: repo.id,
                totalCommits: residencyActivity.residencyCommits,
                lastCommitDate: activity.lastCommitDate,
                weeksActive: activity.weeksActive ?? 0,
                isActive: activity.isActive,
                snapshotDate: new Date(),
                isRetroactive: false,
              });

              // Store attestation record
              await db.attestation.create({
                data: {
                  uid: attestation.uid,
                  repositoryId: repo.id,
                  schemaId: env.EAS_SCHEMA_UID,
                  chain: "optimism",
                  data: {
                    projectId: repo.project.id,
                    repositoryId: repo.id,
                    totalCommits: residencyActivity.residencyCommits,
                    lastCommitDate:
                      activity.lastCommitDate?.toISOString() ?? null,
                    weeksActive: activity.weeksActive ?? 0,
                    isActive: activity.isActive,
                  },
                  snapshotDate: new Date(),
                  isRetroactive: false,
                },
              });

              console.log(`   ✓ Attestation: ${attestation.uid}`);
            } catch (error) {
              console.error(
                `   ⚠ Attestation failed (sync still succeeded):`,
                error instanceof Error ? error.message : error,
              );
            }
          }
        }
      }

      console.log(`   ✓ Success\n`);
      successCount++;
      results.push({
        repositoryId: repo.id,
        repositoryUrl: repo.url,
        projectTitle: repo.project.title,
        success: true,
      });

      // Rate limiting delay (avoid hitting GitHub API limits)
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`   ✗ Failed: ${errorMessage}\n`);
      errorCount++;
      results.push({
        repositoryId: repo.id,
        repositoryUrl: repo.url,
        projectTitle: repo.project.title,
        success: false,
        error: errorMessage,
      });
    }
  }

  // Generate summary report
  console.log("=".repeat(80));
  console.log("📊 SYNC SUMMARY");
  console.log("=".repeat(80));
  console.log(`\nTotal Repositories: ${repositories.length}`);
  console.log(`✓ Successful: ${successCount}`);
  console.log(`✗ Failed: ${errorCount}`);

  if (errorCount > 0) {
    console.log("\n❌ Failed Repositories:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.projectTitle} (${r.repositoryUrl})`);
        console.log(`     Error: ${r.error}`);
      });
  }

  console.log("\n✅ Sync complete!");

  await db.$disconnect();
}

void main();
