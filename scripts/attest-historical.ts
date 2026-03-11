#!/usr/bin/env bun
/**
 * Historical Attestation Script
 *
 * Creates retroactive weekly attestations for any residency event.
 * Reads from existing DB data - no GitHub API calls.
 *
 * Usage:
 *   bunx tsx scripts/attest-historical.ts --event-id <eventId> [--dry-run]
 *
 * Examples:
 *   bunx tsx scripts/attest-historical.ts --event-id funding-commons-residency-2025 --dry-run
 *   bunx tsx scripts/attest-historical.ts --event-id chiang-mai-residency-2024
 */

// Load environment variables from .env.local first, then .env
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient, type Prisma } from "@prisma/client";
import { createEASService } from "~/server/services/eas";

const db = new PrismaClient();

// Determine chain based on environment (matches EAS service logic)
const isMainnet = process.env.EAS_USE_MAINNET === "true";
const chainName = isMainnet ? "optimism-mainnet" : "optimism-sepolia";

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const eventIdIndex = args.indexOf("--event-id");
const eventIdArg = eventIdIndex !== -1 ? args[eventIdIndex + 1] : undefined;

if (!eventIdArg) {
  console.error(
    "Usage: bunx tsx scripts/attest-historical.ts --event-id <eventId> [--dry-run]",
  );
  console.error("\nExamples:");
  console.error(
    "  bunx tsx scripts/attest-historical.ts --event-id funding-commons-residency-2025 --dry-run",
  );
  console.error(
    "  bunx tsx scripts/attest-historical.ts --event-id chiang-mai-residency-2024",
  );
  process.exit(1);
}

// After validation, eventId is guaranteed to be a string
const eventId: string = eventIdArg;

interface CommitDataPoint {
  date: string; // "YYYY-MM-DD"
  count: number;
}

interface WeeklySnapshot {
  weekStart: Date;
  weekEnd: Date;
  cumulativeCommits: number;
  weeklyCommits: number;
  weeksActive: number;
}

interface AttestationRecord {
  repositoryId: string;
  projectTitle: string;
  weekLabel: string;
  uid?: string;
  success: boolean;
  error?: string;
}

/**
 * Reconstructs weekly snapshots from commit data
 * Each snapshot represents the state at the end of that week
 */
function reconstructWeeklySnapshots(
  commitsData: CommitDataPoint[],
  startDate: Date,
  endDate: Date,
): WeeklySnapshot[] {
  // Sort commits by date
  const sorted = [...commitsData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const snapshots: WeeklySnapshot[] = [];
  const currentDate = new Date(startDate);
  let cumulativeCommits = 0;
  let weeksWithActivity = 0;

  while (currentDate <= endDate) {
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

    // Count commits in this week
    const weeklyCommits = sorted
      .filter((c) => {
        const d = new Date(c.date);
        return d >= currentDate && d <= weekEnd;
      })
      .reduce((sum, c) => sum + c.count, 0);

    cumulativeCommits += weeklyCommits;
    if (weeklyCommits > 0) weeksWithActivity++;

    snapshots.push({
      weekStart: new Date(currentDate),
      weekEnd: new Date(weekEnd),
      cumulativeCommits,
      weeklyCommits,
      weeksActive: weeksWithActivity,
    });

    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return snapshots;
}

async function main() {
  console.log("\n=".repeat(60));
  console.log("Historical Attestation Script");
  console.log("=".repeat(60));
  console.log(`Event ID: ${eventId}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  // Validate EAS configuration for live runs
  if (!dryRun) {
    if (!process.env.EAS_PRIVATE_KEY) {
      console.error(
        "Error: EAS_PRIVATE_KEY environment variable is required for live runs",
      );
      console.error(
        "   Add it to your .env.local file or use --dry-run to preview",
      );
      process.exit(1);
    }

    if (!process.env.EAS_SCHEMA_UID) {
      console.error("Error: EAS_SCHEMA_UID environment variable is required");
      console.error(
        "   Register a schema first or set the existing schema UID",
      );
      process.exit(1);
    }
  }

  // Get event details
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  if (!event) {
    console.error(`Error: Event not found: ${eventId}`);
    process.exit(1);
  }

  console.log(`Event: ${event.name}`);
  console.log(
    `Period: ${event.startDate.toISOString().split("T")[0]} to ${event.endDate.toISOString().split("T")[0]}`,
  );
  console.log(`Network: ${chainName} (${isMainnet ? "MAINNET" : "TESTNET"})`);

  // Query repositories with residency metrics for this event
  const residencyMetrics = await db.repositoryResidencyMetrics.findMany({
    where: { eventId },
    include: {
      repository: {
        include: {
          project: { select: { id: true, title: true } },
          attestations: {
            select: { id: true, snapshotDate: true, isRetroactive: true },
          },
        },
      },
    },
  });

  console.log(
    `\nFound ${residencyMetrics.length} repositories with residency metrics\n`,
  );

  if (residencyMetrics.length === 0) {
    console.log("No repositories found for this event.");
    console.log(
      "Run sync-github-activity.ts first to populate residency metrics.",
    );
    await db.$disconnect();
    process.exit(0);
  }

  // Initialize EAS service for live runs
  let easService: ReturnType<typeof createEASService> | null = null;
  if (!dryRun) {
    easService = createEASService();
    if (process.env.EAS_SCHEMA_UID) {
      easService.setSchemaUid(process.env.EAS_SCHEMA_UID);
    }
    console.log(`EAS Schema UID: ${easService.getSchemaUid()}`);
    console.log(`Signer Address: ${await easService.getSignerAddress()}`);
    console.log("");
  }

  const results: AttestationRecord[] = [];
  let totalAttestations = 0;
  let totalErrors = 0;

  for (const metrics of residencyMetrics) {
    const repo = metrics.repository;
    // Use residency-specific commits data, fall back to repository lifetime data
    const commitsData = (metrics.commitsData ?? repo.commitsData) as
      | CommitDataPoint[]
      | null;

    console.log(`\n${"─".repeat(50)}`);
    console.log(`Project: ${repo.project.title}`);
    console.log(`Repository: ${repo.name ?? repo.url}`);

    if (!commitsData || commitsData.length === 0) {
      console.log("  Skipping: No commits data available");
      continue;
    }

    // Check existing retroactive attestations for THIS event period
    const existingRetroactive = repo.attestations.filter((a) => {
      if (!a.isRetroactive) return false;
      // Check if attestation is within this event's date range
      const snapshotTime = a.snapshotDate.getTime();
      return (
        snapshotTime >= event.startDate.getTime() &&
        snapshotTime <= event.endDate.getTime()
      );
    });

    // Get the week start dates of existing attestations to skip duplicates
    const existingWeekStarts = new Set(
      existingRetroactive.map((a) => {
        // Round snapshot date to start of week to match with snapshots
        const date = new Date(a.snapshotDate);
        const dayOfWeek = date.getUTCDay();
        const diff = date.getUTCDate() - dayOfWeek;
        const weekStart = new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff),
        );
        return weekStart.toISOString().split("T")[0];
      }),
    );

    // Check if we have all 4 weekly attestations
    if (existingRetroactive.length >= 4) {
      console.log(
        `  Skipping: Already has ${existingRetroactive.length} retroactive attestations`,
      );
      continue;
    } else if (existingRetroactive.length > 0) {
      console.log(
        `  Partial: Has ${existingRetroactive.length} retroactive attestations, completing remaining...`,
      );
    }

    // Reconstruct weekly snapshots
    const snapshots = reconstructWeeklySnapshots(
      commitsData,
      event.startDate,
      event.endDate,
    );
    console.log(`  Reconstructed ${snapshots.length} weekly snapshots`);

    for (const snapshot of snapshots) {
      const weekLabel = snapshot.weekStart.toISOString().split("T")[0]!;

      // Skip weeks that already have attestations
      if (existingWeekStarts.has(weekLabel)) {
        console.log(`  Skipping week ${weekLabel}: Already attested`);
        continue;
      }

      if (dryRun) {
        console.log(
          `  [DRY RUN] Week ${weekLabel}: ${snapshot.cumulativeCommits} total commits, ` +
            `${snapshot.weeklyCommits} this week, ${snapshot.weeksActive} weeks active`,
        );
        totalAttestations++;
        results.push({
          repositoryId: repo.id,
          projectTitle: repo.project.title,
          weekLabel,
          success: true,
        });
        continue;
      }

      // Note: If DB write fails after on-chain attestation, we have an orphaned attestation.
      // The script logs the UID so it can be manually reconciled if needed.
      try {
        const attestation = await easService!.createAttestation({
          projectId: repo.project.id,
          repositoryId: repo.id,
          totalCommits: snapshot.cumulativeCommits,
          lastCommitDate: snapshot.weekEnd,
          weeksActive: snapshot.weeksActive,
          isActive: snapshot.weeklyCommits > 0,
          snapshotDate: snapshot.weekEnd,
          isRetroactive: true,
        });

        // Store attestation record in database
        await db.attestation.create({
          data: {
            uid: attestation.uid,
            repositoryId: repo.id,
            schemaId: process.env.EAS_SCHEMA_UID ?? "",
            chain: chainName,
            data: {
              projectId: repo.project.id,
              repositoryId: repo.id,
              totalCommits: snapshot.cumulativeCommits,
              lastCommitDate: snapshot.weekEnd.toISOString(),
              weeksActive: snapshot.weeksActive,
              isActive: snapshot.weeklyCommits > 0,
            } as Prisma.InputJsonValue,
            snapshotDate: snapshot.weekEnd,
            isRetroactive: true,
          },
        });

        console.log(`  Week ${weekLabel}: ${attestation.uid}`);
        totalAttestations++;
        results.push({
          repositoryId: repo.id,
          projectTitle: repo.project.title,
          weekLabel,
          uid: attestation.uid,
          success: true,
        });

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 100));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`  Week ${weekLabel} failed: ${errorMessage}`);
        totalErrors++;
        results.push({
          repositoryId: repo.id,
          projectTitle: repo.project.title,
          weekLabel,
          success: false,
          error: errorMessage,
        });
      }
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(
    `${dryRun ? "Would create" : "Created"}: ${totalAttestations} attestations`,
  );
  if (totalErrors > 0) {
    console.log(`Errors: ${totalErrors}`);
  }

  // Show failed attestations if any
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log("\nFailed Attestations:");
    for (const f of failures) {
      console.log(`  - ${f.projectTitle} (${f.weekLabel}): ${f.error}`);
    }
  }

  // Show attestation URLs for successful live runs
  if (!dryRun && easService) {
    const successes = results.filter((r) => r.success && r.uid);
    if (successes.length > 0) {
      console.log("\nAttestation URLs (first 5):");
      for (const s of successes.slice(0, 5)) {
        console.log(`  - ${s.projectTitle} (${s.weekLabel}):`);
        console.log(`    ${easService.getExplorerUrl(s.uid!)}`);
      }
      if (successes.length > 5) {
        console.log(`  ... and ${successes.length - 5} more`);
      }
    }
  }

  console.log("");

  await db.$disconnect();
}

void main().catch((error) => {
  console.error("Error:", error);
  void db.$disconnect();
  process.exit(1);
});
