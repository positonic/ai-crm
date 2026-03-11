import { db } from "./src/server/db";

async function checkRecentPraise() {
  const praises = await db.praise.findMany({
    include: {
      sender: {
        select: {
          name: true,
          email: true,
        },
      },
      recipient: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  console.log(`\n📊 Last 5 Praise Records:\n`);

  if (praises.length === 0) {
    console.log("❌ No praise found in database");
  } else {
    praises.forEach((praise, index) => {
      console.log(
        `${index + 1}. ${praise.sender?.name ?? "Unknown"} → ${praise.recipient?.name ?? `@${praise.recipientName}`}`,
      );
      console.log(`   Message: "${praise.message}"`);
      console.log(`   Created: ${praise.createdAt.toISOString()}`);
      console.log(
        `   Channel posted: ${praise.channelMessageId ? "Yes" : "No"}`,
      );
      console.log("");
    });
  }

  await db.$disconnect();
}

checkRecentPraise().catch(console.error);
