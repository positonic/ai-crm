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
  userName?: string;
}

async function identifyDuplicates(targetEmail?: string) {
  const emailFilter = targetEmail ? ` for ${targetEmail}` : "";
  console.log(`🔍 Identifying duplicate applications${emailFilter}...\n`);

  try {
    // Find all applications
    const allApplications = await db.application.findMany({
      where: targetEmail ? { email: targetEmail } : undefined,
      include: {
        responses: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(
      `📊 Total applications${emailFilter}: ${allApplications.length}`,
    );

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
        userName: app.user?.name ?? undefined,
      };

      if (!groupedByEmailEvent.has(key)) {
        groupedByEmailEvent.set(key, []);
      }
      groupedByEmailEvent.get(key)!.push(summary);
    });

    // Find duplicates (more than 1 application per email+event)
    const duplicates = Array.from(groupedByEmailEvent.entries())
      .filter(([, apps]) => apps.length > 1)
      .sort(([a], [b]) => a.localeCompare(b)); // Sort by email

    console.log(
      `📧 Unique email+event combinations: ${groupedByEmailEvent.size}`,
    );
    console.log(`🔄 Duplicate combinations found: ${duplicates.length}\n`);

    if (duplicates.length === 0) {
      console.log("✅ No duplicates found!");
      if (targetEmail) {
        // Show the single application details
        const singleApp = groupedByEmailEvent.get(
          `${targetEmail}|funding-commons-residency-2025`,
        );
        if (singleApp && singleApp.length === 1) {
          const app = singleApp[0]!;
          console.log(`📋 Single application for ${targetEmail}:`);
          console.log(`   ID: ${app.id}`);
          console.log(
            `   User: ${app.hasUserId ? `${app.userName} (${app.userId})` : "Not linked"}`,
          );
          console.log(`   Responses: ${app.responseCount}`);
          console.log(`   Status: ${app.status}`);
          console.log(`   Source: ${app.source}`);
        }
      }
      return;
    }

    // Display duplicates
    console.log("🔄 DUPLICATE APPLICATIONS FOUND:\n");

    for (const [emailEvent, apps] of duplicates) {
      const [email, eventId] = emailEvent.split("|");
      console.log(`📧 ${email} (Event: ${eventId}):`);

      // Sort by priority: linked users first, then by response count, then by creation date
      const sortedApps = [...apps].sort((a, b) => {
        if (a.hasUserId !== b.hasUserId) {
          return a.hasUserId ? -1 : 1;
        }
        if (a.responseCount !== b.responseCount) {
          return b.responseCount - a.responseCount;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      sortedApps.forEach((app, index) => {
        const priority = index === 0 ? "🥇 WOULD KEEP" : "🗑️  WOULD REMOVE";
        const linkStatus = app.hasUserId
          ? `linked to ${app.userName}`
          : "unlinked";
        console.log(`   ${priority} ${app.id}`);
        console.log(
          `      📊 ${app.responseCount} responses | ${linkStatus} | ${app.source} | ${app.status}`,
        );
        console.log(
          `      📅 Created: ${app.createdAt.toLocaleDateString()} ${app.createdAt.toLocaleTimeString()}`,
        );
      });

      const totalResponses = sortedApps.reduce(
        (sum, app) => sum + app.responseCount,
        0,
      );
      const keeperApp = sortedApps[0]!;
      const keeperLinkStatus = keeperApp.hasUserId
        ? `linked to ${keeperApp.userName}`
        : "unlinked";

      console.log(`   📈 Total responses across all: ${totalResponses}`);
      console.log(
        `   🎯 Would merge into: ${keeperApp.id} (${keeperLinkStatus})\n`,
      );
    }

    console.log(`\n🎯 Summary:`);
    console.log(`   📧 ${duplicates.length} email addresses have duplicates`);
    console.log(
      `   📋 ${duplicates.reduce((sum, [, apps]) => sum + apps.length, 0)} total duplicate applications`,
    );
    console.log(
      `   🔗 ${duplicates.filter(([, apps]) => apps.some((app) => app.hasUserId)).length} have at least one linked application`,
    );
    console.log(
      `   📦 ${duplicates.filter(([, apps]) => apps.every((app) => !app.hasUserId)).length} have only unlinked applications`,
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith("--"));

console.log("🔍 DUPLICATE APPLICATION IDENTIFIER");
console.log("This script only reads data - no changes are made.\n");

if (email) {
  console.log(`🎯 Target email: ${email}\n`);
}

console.log(
  "Usage: bunx tsx scripts/identify-duplicate-applications.ts [email]",
);
console.log("Examples:");
console.log("  bunx tsx scripts/identify-duplicate-applications.ts");
console.log(
  "  bunx tsx scripts/identify-duplicate-applications.ts james@12butterflies.life\n",
);

identifyDuplicates(email).catch(console.error);
