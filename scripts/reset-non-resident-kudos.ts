#!/usr/bin/env tsx
/**
 * Reset kudos to zero for users who don't have any accepted applications
 *
 * This script:
 * 1. Finds all users with kudos > 0
 * 2. Checks if they have any ACCEPTED applications
 * 3. Resets kudos to 0 for users without accepted applications
 *
 * Usage: bun run scripts/reset-non-resident-kudos.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🔍 Finding users with kudos who aren't accepted residents...\n");

  // Get all users with kudos > 0
  const usersWithKudos = await db.user.findMany({
    where: {
      kudos: {
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      firstName: true,
      surname: true,
      email: true,
      kudos: true,
      applications: {
        where: {
          status: "ACCEPTED",
        },
        select: {
          id: true,
          status: true,
          event: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  console.log(`📊 Found ${usersWithKudos.length} users with kudos > 0`);

  // Filter to users without accepted applications
  const usersToReset = usersWithKudos.filter(
    (user) => user.applications.length === 0,
  );

  console.log(
    `❌ Found ${usersToReset.length} users with kudos but NO accepted applications:\n`,
  );

  if (usersToReset.length === 0) {
    console.log(
      "✅ No users to reset! All users with kudos have accepted applications.",
    );
    return;
  }

  // Display users who will be reset
  usersToReset.forEach((user) => {
    const name =
      user.name ??
      `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() ??
      user.email;
    console.log(`   • ${name} - Current kudos: ${user.kudos}`);
  });

  console.log("\n⚠️  WARNING: This will reset kudos to 0 for the above users.");
  console.log("   (Users with accepted applications will keep their kudos)\n");

  // In production, you might want to add a confirmation prompt here
  // For now, we'll just proceed with a dry run option

  const isDryRun = process.env.DRY_RUN === "true";

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
    console.log("\nTo actually reset kudos, run:");
    console.log("  bun run scripts/reset-non-resident-kudos.ts\n");
    return;
  }

  // Reset kudos to 0 for users without accepted applications
  console.log("🔄 Resetting kudos to 0...\n");

  const updateResults = await Promise.all(
    usersToReset.map(async (user) => {
      const result = await db.user.update({
        where: { id: user.id },
        data: { kudos: 0 },
        select: {
          id: true,
          name: true,
          kudos: true,
        },
      });
      return result;
    }),
  );

  console.log(
    `✅ Successfully reset kudos for ${updateResults.length} users\n`,
  );

  // Show summary
  const totalKudosReset = usersToReset.reduce(
    (sum, user) => sum + user.kudos,
    0,
  );
  console.log("📊 Summary:");
  console.log(`   • Users reset: ${updateResults.length}`);
  console.log(`   • Total kudos reset: ${totalKudosReset.toFixed(2)}`);
  console.log(
    `   • Users still with kudos: ${usersWithKudos.length - usersToReset.length}`,
  );

  // Show users who kept their kudos (have accepted applications)
  const usersWithAcceptedApps = usersWithKudos.filter(
    (user) => user.applications.length > 0,
  );

  if (usersWithAcceptedApps.length > 0) {
    console.log(
      `\n✅ Users with kudos who have accepted applications (${usersWithAcceptedApps.length}):`,
    );
    usersWithAcceptedApps.forEach((user) => {
      const name =
        user.name ??
        `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() ??
        user.email;
      const events = user.applications.map((app) => app.event.name).join(", ");
      console.log(
        `   • ${name} - Kudos: ${user.kudos.toFixed(2)} - Events: ${events}`,
      );
    });
  }
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .then(() => db.$disconnect())
  .catch((error) => {
    console.error("❌ Disconnect error:", error);
  });
