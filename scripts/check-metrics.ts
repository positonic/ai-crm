/**
 * Check metrics in database
 */

import { db } from "~/server/db";

async function checkMetrics() {
  const count = await db.metric.count();
  console.log(`\n📊 Total metrics in database: ${count}`);

  if (count > 0) {
    console.log("\n📋 First 10 metrics:");
    const metrics = await db.metric.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    metrics.forEach((metric, i) => {
      console.log(`  ${i + 1}. ${metric.name} (${metric.slug})`);
    });
  }
}

checkMetrics()
  .then(() => {
    console.log("\n✅ Check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
