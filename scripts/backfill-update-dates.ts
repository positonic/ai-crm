/**
 * Backfill updateDate field for existing ProjectUpdate records
 * Sets updateDate = createdAt for all records where updateDate is not already set
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting backfill of updateDate field...\n");

  try {
    // Get all project updates
    const updates = await prisma.projectUpdate.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        updateDate: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(`Found ${updates.length} project updates to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Update each record
    for (const update of updates) {
      // Check if updateDate is different from createdAt (already has a custom date)
      const needsUpdate =
        update.updateDate.getTime() !== update.createdAt.getTime();

      if (needsUpdate) {
        await prisma.projectUpdate.update({
          where: { id: update.id },
          data: {
            updateDate: update.createdAt,
          },
        });

        console.log(
          `✓ Updated: "${update.title.substring(0, 50)}${update.title.length > 50 ? "..." : ""}" - Set updateDate to ${update.createdAt.toISOString()}`,
        );
        updatedCount++;
      } else {
        console.log(
          `⊘ Skipped: "${update.title.substring(0, 50)}${update.title.length > 50 ? "..." : ""}" - updateDate already matches createdAt`,
        );
        skippedCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Backfill completed!");
    console.log(`Total records: ${updates.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Error during backfill:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
