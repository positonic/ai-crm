import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as csv from "csv-parser";

const prisma = new PrismaClient();

interface CSVRow {
  [key: string]: string;
}

interface UpdateStats {
  total: number;
  found: number;
  updated: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}

// Column names for prior experience (both variants)
const PRIOR_EXPERIENCE_COLUMNS = [
  "What is your prior experience with cryptography/currency, decentralized technologies, and/or climate, and public goods funding systems?",
  "What is your prior experience with cryptography/currency, decentralized technologies, and/or climate, and public goods funding systems? / Cuéntanos más sobre tu experiencia en criptografía, criptomonedas, tecnologías descentralizadas y/o sistemas de financiación de bienes públicos.",
];

const EMAIL_COLUMN = "Email / Correo electrónico";
const PRIOR_EXPERIENCE_QUESTION_KEY = "prior_experience";

async function readCSV(filePath: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    fs.createReadStream(filePath)
      .pipe(csv.default())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

async function updatePriorExperience(
  csvFilePath: string,
  eventId: string,
  dryRun: boolean = true,
): Promise<UpdateStats> {
  const stats: UpdateStats = {
    total: 0,
    found: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    console.log(`📖 Reading CSV file: ${csvFilePath}`);
    console.log(
      `${dryRun ? "🔍 DRY RUN MODE - No changes will be made" : "✏️ LIVE MODE - Changes will be applied"}`,
    );

    const csvData = await readCSV(csvFilePath);
    stats.total = csvData.length;

    console.log(`📊 Found ${csvData.length} rows in CSV`);

    // Get the prior experience question for this event
    const priorExpQuestion = await prisma.applicationQuestion.findFirst({
      where: {
        eventId,
        questionKey: PRIOR_EXPERIENCE_QUESTION_KEY,
      },
    });

    if (!priorExpQuestion) {
      throw new Error(
        `Prior experience question not found for event ${eventId}`,
      );
    }

    console.log(
      `✅ Found prior experience question: "${priorExpQuestion.questionEn}"`,
    );

    // Process each CSV row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row

      try {
        // Extract email from row
        const email = row?.[EMAIL_COLUMN]?.trim().toLowerCase();
        if (!email) {
          stats.errors.push({
            email: `Row ${rowNumber}`,
            error: "Email not found in CSV row",
          });
          continue;
        }

        // Find prior experience data from CSV (try both column variants)
        let priorExpData = "";
        for (const columnName of PRIOR_EXPERIENCE_COLUMNS) {
          const data = row?.[columnName]?.trim();
          if (data) {
            priorExpData = data;
            break;
          }
        }

        if (!priorExpData) {
          console.log(`⚠️  No prior experience data found for ${email} in CSV`);
          stats.skipped++;
          continue;
        }

        // Find the application in database
        const application = await prisma.application.findFirst({
          where: {
            email,
            eventId,
          },
          include: {
            responses: {
              where: {
                questionId: priorExpQuestion.id,
              },
            },
          },
        });

        if (!application) {
          console.log(`⚠️  Application not found for ${email}`);
          stats.skipped++;
          continue;
        }

        stats.found++;

        // Check if prior experience response already exists
        const existingResponse = application.responses[0];

        if (existingResponse && existingResponse.answer.trim()) {
          console.log(
            `⚠️  Prior experience already exists for ${email} - skipping`,
          );
          stats.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`\n📋 WOULD UPDATE: ${email}`);
          console.log(`   Application ID: ${application.id}`);
          console.log(`   Question: "${priorExpQuestion.questionEn}"`);
          console.log(
            `   Current value: ${existingResponse?.answer ? `"${existingResponse.answer}"` : "EMPTY/MISSING"}`,
          );
          console.log(`   New value: "${priorExpData}"`);
          console.log(
            `   Action: ${existingResponse ? "UPDATE existing response" : "CREATE new response"}`,
          );
          console.log(
            `   ───────────────────────────────────────────────────────────────────`,
          );
        } else {
          console.log(`🎯 Updating ${email} with prior experience data...`);

          // Create or update the response
          if (existingResponse) {
            // Update existing empty response
            await prisma.applicationResponse.update({
              where: { id: existingResponse.id },
              data: { answer: priorExpData },
            });
            console.log(`✅ Updated existing response for ${email}`);
          } else {
            // Create new response
            await prisma.applicationResponse.create({
              data: {
                applicationId: application.id,
                questionId: priorExpQuestion.id,
                answer: priorExpData,
              },
            });
            console.log(`✅ Created new response for ${email}`);
          }
        }

        stats.updated++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        stats.errors.push({
          email: row?.[EMAIL_COLUMN] ?? `Row ${rowNumber}`,
          error: errorMessage,
        });
        console.error(
          `❌ Error processing ${row?.[EMAIL_COLUMN] ?? `row ${rowNumber}`}:`,
          errorMessage,
        );
      }
    }
  } catch (error) {
    console.error("❌ Failed to process CSV file:", error);
    throw error;
  }

  return stats;
}

async function main() {
  console.log("🚀 Starting prior experience data update...");

  // Get event ID for residency
  const residencyEvent = await prisma.event.findUnique({
    where: { id: "funding-commons-residency-2025" },
  });

  if (!residencyEvent) {
    console.error(
      "❌ Residency event not found. Please ensure the event exists.",
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error(
      "❌ Usage: tsx scripts/update-prior-experience.ts <csv-file-path> [--live]",
    );
    console.error("   By default, runs in DRY RUN mode (no changes made)");
    console.error("   Add --live flag to actually apply changes");
    console.error(
      "   Example: tsx scripts/update-prior-experience.ts imports/2025-import-migration-gap.csv",
    );
    console.error(
      "   Example: tsx scripts/update-prior-experience.ts imports/2025-import-migration-gap.csv --live",
    );
    process.exit(1);
  }

  const csvFilePath = args[0];
  const isLiveMode = args.includes("--live");

  if (!csvFilePath || !fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  try {
    const stats = await updatePriorExperience(
      csvFilePath,
      residencyEvent.id,
      !isLiveMode, // dryRun = true unless --live flag is provided
    );

    console.log("\n🎉 Update completed!");
    console.log(`📊 Statistics:`);
    console.log(`   Total CSV rows: ${stats.total}`);
    console.log(`   Applications found in DB: ${stats.found}`);
    console.log(
      `   ${isLiveMode ? "Updated" : "Would update"}: ${stats.updated}`,
    );
    console.log(`   Skipped: ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      stats.errors.forEach((error) => {
        console.log(`   ${error.email}: ${error.error}`);
      });
    }

    if (!isLiveMode && stats.updated > 0) {
      console.log(
        "\n💡 This was a DRY RUN. To actually apply changes, run again with --live flag:",
      );
      console.log(
        `   tsx scripts/update-prior-experience.ts ${csvFilePath} --live`,
      );
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run main function
main().catch(console.error);
