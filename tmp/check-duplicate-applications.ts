#!/usr/bin/env tsx

/**
 * One-off script to check for duplicate applications based on email address
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function findDuplicateApplications() {
  try {
    console.log("🔍 Checking for duplicate applications by email...\n");

    // Find emails with multiple applications
    const duplicateEmails = await prisma.application.groupBy({
      by: ["email"],
      having: {
        email: {
          _count: {
            gt: 1,
          },
        },
      },
      _count: {
        email: true,
      },
      orderBy: {
        _count: {
          email: "desc",
        },
      },
    });

    if (duplicateEmails.length === 0) {
      console.log("✅ No duplicate applications found!");
      return;
    }

    console.log(
      `❗ Found ${duplicateEmails.length} emails with multiple applications:\n`,
    );

    // Get detailed info for each duplicate email
    for (const duplicate of duplicateEmails) {
      const applications = await prisma.application.findMany({
        where: {
          email: duplicate.email,
        },
        include: {
          event: {
            select: {
              name: true,
              id: true,
            },
          },
          user: {
            select: {
              name: true,
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      console.log(
        `📧 Email: ${duplicate.email} (${duplicate._count.email} applications)`,
      );

      applications.forEach((app, index) => {
        console.log(`  ${index + 1}. Application ID: ${app.id}`);
        console.log(`     Event: ${app.event.name} (${app.eventId})`);
        console.log(`     Status: ${app.status}`);
        console.log(
          `     Complete: ${app.isComplete ? "✅ Complete" : "❌ Incomplete"}`,
        );
        console.log(
          `     User: ${app.user?.name ?? "No user linked"} (${app.userId ?? "null"})`,
        );
        console.log(`     Created: ${app.createdAt.toISOString()}`);
        console.log(
          `     Submitted: ${app.submittedAt?.toISOString() ?? "Not submitted"}`,
        );
        console.log("");
      });

      console.log("---\n");
    }

    // Summary statistics
    const totalDuplicateApps = duplicateEmails.reduce(
      (sum, dup) => sum + dup._count.email,
      0,
    );
    const totalUniqueEmails = duplicateEmails.length;
    const extraApplications = totalDuplicateApps - totalUniqueEmails;

    console.log("📊 Summary:");
    console.log(`   • ${totalUniqueEmails} emails have duplicates`);
    console.log(
      `   • ${totalDuplicateApps} total applications from these emails`,
    );
    console.log(
      `   • ${extraApplications} extra applications (potential duplicates to review)`,
    );
  } catch (error) {
    console.error("❌ Error checking for duplicates:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check for same event duplicates specifically
async function findSameEventDuplicates() {
  console.log(
    "\n🎯 Checking for duplicate applications to the SAME event...\n",
  );

  const sameEventDuplicates = await prisma.application.groupBy({
    by: ["email", "eventId"],
    having: {
      email: {
        _count: {
          gt: 1,
        },
      },
    },
    _count: {
      email: true,
    },
  });

  if (sameEventDuplicates.length === 0) {
    console.log("✅ No duplicate applications to the same event found!");
    return;
  }

  console.log(
    `❗ Found ${sameEventDuplicates.length} email/event combinations with duplicates:\n`,
  );

  for (const duplicate of sameEventDuplicates) {
    const applications = await prisma.application.findMany({
      where: {
        email: duplicate.email,
        eventId: duplicate.eventId,
      },
      include: {
        event: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log(
      `📧 ${duplicate.email} → ${applications[0]?.event.name} (${duplicate._count.email} applications)`,
    );
    applications.forEach((app, index) => {
      const completeness = app.isComplete ? "✅ Complete" : "❌ Incomplete";
      console.log(
        `  ${index + 1}. ID: ${app.id} | Status: ${app.status} | ${completeness} | Created: ${app.createdAt.toISOString()}`,
      );
    });
    console.log("");
  }
}

// Run both checks
async function main() {
  await findDuplicateApplications();
  await findSameEventDuplicates();
}

main().catch(console.error);
