#!/usr/bin/env tsx

/**
 * Phase 1: Analysis Script - Identify DRAFT applications that should be SUBMITTED
 *
 * This script finds applications that:
 * 1. Have status = "DRAFT"
 * 2. Have a submittedAt timestamp (indicating user clicked submit)
 * 3. Are actually complete (pass validation logic)
 *
 * Run with: bunx tsx scripts/analyze-draft-applications.ts
 */

import { PrismaClient } from "@prisma/client";
import { checkApplicationCompleteness } from "~/server/api/utils/applicationCompletion";

const db = new PrismaClient();

interface AnalysisResult {
  applicationId: string;
  eventId: string;
  userEmail: string;
  userName?: string;
  submittedAt: Date;
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
  shouldBeSubmitted: boolean;
}

async function analyzeApplications(): Promise<AnalysisResult[]> {
  console.log("🔍 Starting analysis of DRAFT applications...\n");

  // Find all DRAFT applications with submittedAt timestamps
  const draftApplications = await db.application.findMany({
    where: {
      status: "DRAFT",
      submittedAt: { not: null },
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      event: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  console.log(
    `Found ${draftApplications.length} DRAFT applications with submittedAt timestamps`,
  );

  if (draftApplications.length === 0) {
    console.log("✅ No affected applications found!");
    return [];
  }

  const results: AnalysisResult[] = [];

  for (const application of draftApplications) {
    console.log(`\n📋 Analyzing application ${application.id}...`);

    try {
      // Use the same validation logic as the "Check for Missing Information" functionality
      const completionResult = await checkApplicationCompleteness(
        db,
        application.id,
      );

      const shouldBeSubmitted = completionResult.isComplete;

      const result: AnalysisResult = {
        applicationId: application.id,
        eventId: application.eventId,
        userEmail: application.user?.email ?? "UNKNOWN_EMAIL",
        userName: application.user?.name ?? undefined,
        submittedAt: application.submittedAt!,
        isComplete: completionResult.isComplete,
        missingFields: completionResult.missingFields,
        completionPercentage: completionResult.completionPercentage,
        shouldBeSubmitted,
      };

      results.push(result);

      // Log individual result
      console.log(
        `  👤 User: ${result.userName ?? "Unknown"} (${result.userEmail})`,
      );
      console.log(`  📅 Submitted: ${result.submittedAt.toLocaleString()}`);
      console.log(
        `  ✅ Complete: ${result.isComplete} (${result.completionPercentage}%)`,
      );
      if (!result.isComplete) {
        console.log(`  ❌ Missing: ${result.missingFields.join(", ")}`);
      }
      console.log(
        `  🚀 Should be SUBMITTED: ${result.shouldBeSubmitted ? "YES" : "NO"}`,
      );
    } catch (error) {
      console.error(`❌ Error analyzing application ${application.id}:`, error);

      // Still add to results but mark as problematic
      results.push({
        applicationId: application.id,
        eventId: application.eventId,
        userEmail: application.user?.email ?? "UNKNOWN_EMAIL",
        userName: application.user?.name ?? undefined,
        submittedAt: application.submittedAt!,
        isComplete: false,
        missingFields: ["ERROR_DURING_ANALYSIS"],
        completionPercentage: 0,
        shouldBeSubmitted: false,
      });
    }
  }

  return results;
}

function generateSummaryReport(results: AnalysisResult[]) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 ANALYSIS SUMMARY REPORT");
  console.log("=".repeat(60));

  const totalApplications = results.length;
  const completeApplications = results.filter((r) => r.isComplete).length;
  const incompleteApplications = results.filter((r) => !r.isComplete).length;
  const shouldBeSubmitted = results.filter((r) => r.shouldBeSubmitted).length;
  const errorApplications = results.filter((r) =>
    r.missingFields.includes("ERROR_DURING_ANALYSIS"),
  ).length;

  console.log(
    `📋 Total DRAFT applications with submittedAt: ${totalApplications}`,
  );
  console.log(
    `✅ Complete applications (should be SUBMITTED): ${completeApplications}`,
  );
  console.log(
    `❌ Incomplete applications (remain DRAFT): ${incompleteApplications}`,
  );
  console.log(`⚠️  Applications with analysis errors: ${errorApplications}`);

  if (shouldBeSubmitted > 0) {
    console.log(`\n🚀 APPLICATIONS TO BE FIXED (${shouldBeSubmitted}):`);
    console.log("-".repeat(50));

    results
      .filter((r) => r.shouldBeSubmitted)
      .forEach((result, index) => {
        console.log(
          `${index + 1}. ${result.userName ?? "Unknown"} (${result.userEmail})`,
        );
        console.log(`   ID: ${result.applicationId}`);
        console.log(`   Submitted: ${result.submittedAt.toLocaleString()}`);
        console.log(`   Completion: ${result.completionPercentage}%`);
        console.log("");
      });
  }

  if (incompleteApplications > 0) {
    console.log(`\n⚠️  INCOMPLETE APPLICATIONS (${incompleteApplications}):`);
    console.log("-".repeat(50));

    results
      .filter(
        (r) =>
          !r.shouldBeSubmitted &&
          !r.missingFields.includes("ERROR_DURING_ANALYSIS"),
      )
      .forEach((result, index) => {
        console.log(
          `${index + 1}. ${result.userName ?? "Unknown"} (${result.userEmail})`,
        );
        console.log(`   ID: ${result.applicationId}`);
        console.log(`   Completion: ${result.completionPercentage}%`);
        console.log(`   Missing: ${result.missingFields.join(", ")}`);
        console.log("");
      });
  }

  if (errorApplications > 0) {
    console.log(`\n❌ APPLICATIONS WITH ERRORS (${errorApplications}):`);
    console.log("-".repeat(50));

    results
      .filter((r) => r.missingFields.includes("ERROR_DURING_ANALYSIS"))
      .forEach((result, index) => {
        console.log(
          `${index + 1}. ${result.userName ?? "Unknown"} (${result.userEmail})`,
        );
        console.log(`   ID: ${result.applicationId}`);
        console.log(`   Status: Analysis failed - manual review required`);
        console.log("");
      });
  }

  console.log("=".repeat(60));

  if (shouldBeSubmitted > 0) {
    console.log(
      `\n✅ Phase 1 Complete: Found ${shouldBeSubmitted} applications ready for batch fix`,
    );
    console.log(
      "📋 Next: Run Phase 2 script to update these applications to SUBMITTED status",
    );
  } else {
    console.log(
      "\n✅ Phase 1 Complete: No applications need status correction",
    );
  }
}

async function main() {
  try {
    const results = await analyzeApplications();
    generateSummaryReport(results);

    // Save results to JSON file for Phase 2 script
    const fs = await import("fs");
    const outputPath = "/tmp/draft-applications-analysis.json";
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Analysis results saved to: ${outputPath}`);
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run main function if this file is executed directly
main().catch(console.error);

export { analyzeApplications, type AnalysisResult };
