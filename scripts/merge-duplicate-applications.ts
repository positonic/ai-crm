import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface ApplicationSummary {
  id: string;
  userId: string | null;
  email: string;
  eventId: string;
  status: string;
  responseCount: number;
  createdAt: Date;
  hasUserId: boolean;
  source: string;
}

async function mergeDuplicateApplications(
  targetEmail?: string,
  dryRun: boolean = false,
) {
  const emailFilter = targetEmail ? ` for ${targetEmail}` : "";
  console.log(`🔍 Scanning for duplicate applications${emailFilter}...\n`);

  if (dryRun) {
    console.log("🏃 DRY RUN MODE - No changes will be made\n");
  }

  try {
    // Find all applications grouped by email and eventId
    const allApplications = await db.application.findMany({
      where: targetEmail ? { email: targetEmail } : undefined,
      include: {
        responses: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" }, // Oldest first
    });

    // Group by email + eventId combination
    const groupedByEmailEvent = new Map<string, ApplicationSummary[]>();

    allApplications.forEach((app) => {
      const key = `${app.email}|${app.eventId}`;
      const summary: ApplicationSummary = {
        id: app.id,
        userId: app.userId,
        email: app.email,
        eventId: app.eventId,
        status: app.status,
        responseCount: app.responses.length,
        createdAt: app.createdAt,
        hasUserId: !!app.userId,
        source: app.googleFormId
          ? "google_form"
          : app.notionPageId
            ? "notion_form"
            : "platform",
      };

      if (!groupedByEmailEvent.has(key)) {
        groupedByEmailEvent.set(key, []);
      }
      groupedByEmailEvent.get(key)!.push(summary);
    });

    // Find duplicates (more than 1 application per email+event)
    const duplicates = Array.from(groupedByEmailEvent.entries()).filter(
      ([, apps]) => apps.length > 1,
    );

    console.log(`📊 Analysis Results:`);
    console.log(`   Total applications: ${allApplications.length}`);
    console.log(
      `   Unique email+event combinations: ${groupedByEmailEvent.size}`,
    );
    console.log(`   Duplicate combinations found: ${duplicates.length}\n`);

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found - no action needed!");
      return;
    }

    // Process each duplicate group
    for (const [emailEvent, apps] of duplicates) {
      const [email, eventId] = emailEvent.split("|");
      console.log(`🔄 Processing duplicates for ${email} in event ${eventId}:`);

      // BACKUP: Log complete application data before any changes
      console.log(`\n📦 BACKUP DATA - COPY THIS FOR RECOVERY:`);
      console.log(`===============================================`);

      for (const app of apps) {
        const fullAppData = await db.application.findUnique({
          where: { id: app.id },
          include: {
            responses: {
              include: {
                question: {
                  select: {
                    questionKey: true,
                    questionEn: true,
                    questionType: true,
                  },
                },
              },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        console.log(`\n🗂️  APPLICATION ${app.id}:`);
        console.log(
          `   📋 Metadata: ${JSON.stringify(
            {
              id: app.id,
              userId: app.userId,
              email: app.email,
              eventId: app.eventId,
              status: app.status,
              createdAt: app.createdAt.toISOString(),
              googleFormId: fullAppData?.googleFormId,
              notionPageId: fullAppData?.notionPageId,
              linkedUser: fullAppData?.user
                ? { id: fullAppData.user.id, name: fullAppData.user.name }
                : null,
            },
            null,
            2,
          )}`,
        );

        console.log(`   📝 Responses (${app.responseCount}):`);
        fullAppData?.responses.forEach((response) => {
          console.log(
            `      ${response.question.questionKey} (${response.question.questionType}): ${JSON.stringify(response.answer)}`,
          );
        });
      }

      console.log(`===============================================\n`);

      // Sort applications to determine which to keep:
      // 1. Has userId (linked to actual user) - HIGHEST PRIORITY
      // 2. Most responses (most data)
      // 3. Oldest (original)
      const sortedApps = [...apps].sort((a, b) => {
        // Primary: Has userId (linked to user) - this is the "official" application
        if (a.hasUserId !== b.hasUserId) {
          return a.hasUserId ? -1 : 1; // Linked apps come first
        }

        // Secondary: Most responses (data)
        if (a.responseCount !== b.responseCount) {
          return b.responseCount - a.responseCount;
        }

        // Tertiary: Oldest first
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const keepApp = sortedApps[0]!;
      const removeApps = sortedApps.slice(1);

      console.log(`   📋 Applications found:`);
      sortedApps.forEach((app, i) => {
        const marker = i === 0 ? "✅ KEEP" : "❌ REMOVE";
        console.log(
          `      ${marker} ${app.id} (${app.responseCount} responses, ${app.hasUserId ? "linked" : "unlinked"}, ${app.source})`,
        );
      });

      // Merge responses from all applications to the keeper
      console.log(
        `   🔄 ${dryRun ? "WOULD MERGE" : "Merging"} ${removeApps.length} application(s) into ${keepApp.id}...`,
      );

      if (dryRun) {
        console.log(
          `   📋 DRY RUN: Would preserve ${keepApp.responseCount} responses and merge ${removeApps.reduce((sum, app) => sum + app.responseCount, 0)} additional responses`,
        );

        // Show detailed merge preview
        console.log(`   📊 DETAILED MERGE PREVIEW:`);

        // Get keeper responses once for all comparisons
        const keepAppResponses = await db.applicationResponse.findMany({
          where: { applicationId: keepApp.id },
          include: { question: true },
        });
        const keepAppQuestionIds = new Set(
          keepAppResponses.map((r) => r.questionId),
        );
        let totalNewResponses = 0;

        for (const removeApp of removeApps) {
          console.log(`      🔍 Analyzing responses from ${removeApp.id}:`);

          // Get actual responses for detailed preview
          const responsesToMerge = await db.applicationResponse.findMany({
            where: { applicationId: removeApp.id },
            include: { question: true },
          });

          for (const response of responsesToMerge) {
            const hasConflict = keepAppQuestionIds.has(response.questionId);
            const existingResponse = keepAppResponses.find(
              (r) => r.questionId === response.questionId,
            );

            if (hasConflict && existingResponse) {
              console.log(
                `         ⚠️  CONFLICT: ${response.question.questionKey}`,
              );

              if (keepApp.hasUserId) {
                // Keeper app is linked to user - always prefer linked user's value
                console.log(
                  `            Keep: "${existingResponse.answer.substring(0, 60)}..." (linked user's value)`,
                );
                console.log(
                  `            Skip: "${response.answer.substring(0, 60)}..." (unlinked duplicate)`,
                );
              } else {
                // Neither app is linked - use longer/better answer
                const keepExisting =
                  existingResponse.answer.length >= response.answer.length;
                console.log(
                  `            Keep: "${(keepExisting ? existingResponse.answer : response.answer).substring(0, 60)}..." (better answer)`,
                );
                console.log(
                  `            Skip: "${(keepExisting ? response.answer : existingResponse.answer).substring(0, 60)}..." (shorter answer)`,
                );
              }
            } else {
              console.log(
                `         ➕ ADD: ${response.question.questionKey} = "${response.answer.substring(0, 60)}..."`,
              );
              totalNewResponses++;
            }
          }
        }

        console.log(
          `   📈 FINAL RESULT: ${keepApp.id} would have ${keepAppResponses.length + totalNewResponses} total responses`,
        );
        continue; // Skip actual merge operations in dry run
      }

      for (const removeApp of removeApps) {
        // Get responses from application to remove
        const responsesToMerge = await db.applicationResponse.findMany({
          where: { applicationId: removeApp.id },
          include: { question: true },
        });

        console.log(
          `      📝 Merging ${responsesToMerge.length} responses from ${removeApp.id}...`,
        );

        for (const response of responsesToMerge) {
          // Check if keeper already has response for this question
          const existingResponse = await db.applicationResponse.findUnique({
            where: {
              applicationId_questionId: {
                applicationId: keepApp.id,
                questionId: response.questionId,
              },
            },
          });

          if (existingResponse) {
            // Conflict: both applications have this field
            console.log(
              `         ⚠️  CONFLICT: ${response.question.questionKey}`,
            );

            if (keepApp.hasUserId) {
              // Keeper app is linked to user - always prefer linked user's value
              console.log(
                `            ⏭️ SKIP: Keeping linked user's value for ${response.question.questionKey}`,
              );
              // No database update needed - keep existing response
            } else {
              // Neither app is linked - use longer/better answer
              if (response.answer.length > existingResponse.answer.length) {
                console.log(
                  `         🔄 Updating ${response.question.questionKey} (better answer)`,
                );
                await db.applicationResponse.update({
                  where: { id: existingResponse.id },
                  data: { answer: response.answer },
                });
              } else {
                console.log(
                  `         ⏭️ Keeping existing response for ${response.question.questionKey}`,
                );
              }
            }
          } else {
            // Move response to keeper application
            console.log(
              `         📥 Moving response for ${response.question.questionKey}`,
            );
            await db.applicationResponse.update({
              where: { id: response.id },
              data: { applicationId: keepApp.id },
            });
          }
        }

        // Delete the empty duplicate application
        console.log(
          `      🗑️ Removing duplicate application ${removeApp.id}...`,
        );
        await db.application.delete({
          where: { id: removeApp.id },
        });
      }

      console.log(`   ✅ Merge complete for ${email}!\n`);
    }

    console.log("🎉 All duplicate applications have been merged successfully!");
    console.log("\n📝 Recommended next steps:");
    console.log("   1. Test OAuth login with affected email addresses");
    console.log("   2. Verify application data loads correctly");
    console.log("   3. Remove temporary debugging code");
  } catch (error) {
    console.error("❌ Error during merge process:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run") || args.includes("-d");

// Run with confirmation
console.log("🚨 APPLICATION MERGE SCRIPT");
console.log(
  "This will merge duplicate applications for the same email address.",
);
console.log("The application with the most data will be kept.\n");

if (dryRun) {
  console.log("🏃 DRY RUN MODE: No changes will be made - analysis only\n");
}

if (email) {
  console.log(`🎯 Target email: ${email}\n`);
}

console.log(
  "Usage: bunx tsx scripts/merge-duplicate-applications.ts [email] [--dry-run]",
);
console.log("Examples:");
console.log("  bunx tsx scripts/merge-duplicate-applications.ts --dry-run");
console.log(
  "  bunx tsx scripts/merge-duplicate-applications.ts test@email.com --dry-run",
);
console.log(
  "  bunx tsx scripts/merge-duplicate-applications.ts test@email.com\n",
);

mergeDuplicateApplications(email, dryRun).catch(console.error);
