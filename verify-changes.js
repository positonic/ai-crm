import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function verifyChanges() {
  try {
    // Check if any applications were actually modified recently
    const recentlyModified = await db.application.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
      },
      select: {
        id: true,
        email: true,
        userId: true,
        updatedAt: true,
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    console.log(
      `🔍 Applications modified in last 10 minutes: ${recentlyModified.length}`,
    );

    if (recentlyModified.length > 0) {
      console.log("📝 Recently modified applications:");
      recentlyModified.forEach((app) => {
        console.log(
          `   ${app.id}: ${app.email} (${app._count.responses} responses, updated: ${app.updatedAt.toISOString()})`,
        );
      });
    }

    // Check for james@12butterflies.life specifically
    const jamesApps = await db.application.findMany({
      where: { email: "james@12butterflies.life" },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
    });

    console.log(
      `\n📧 Applications for james@12butterflies.life: ${jamesApps.length}`,
    );
    jamesApps.forEach((app) => {
      console.log(
        `   ${app.id}: ${app._count.responses} responses, ${app.userId ? `linked to ${app.user?.name}` : "unlinked"}`,
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

verifyChanges();
