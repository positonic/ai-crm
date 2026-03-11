import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the Intelligence at the Frontier event
  const event = await prisma.event.findFirst({
    where: { slug: "intelligence-at-the-frontier" },
  });

  if (!event) {
    console.error("Event 'intelligence-at-the-frontier' not found");
    process.exit(1);
  }

  // Find the question to delete
  const questions = await prisma.applicationQuestion.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
  });

  console.log(
    `Found ${questions.length} questions for event "${event.name}":\n`,
  );
  for (const q of questions) {
    console.log(`  [${q.id}] (order: ${q.order}) ${q.questionEn}`);
  }

  const target = questions.find((q) =>
    q.questionEn.toLowerCase().includes("what would you like to talk about"),
  );

  if (!target) {
    console.error(
      '\nNo question matching "What would you like to talk about?" found.',
    );
    console.log("Check the list above and update the script if needed.");
    process.exit(1);
  }

  console.log(`\nDeleting question: "${target.questionEn}" (${target.id})`);

  // Delete any responses to this question first
  const deletedResponses = await prisma.applicationResponse.deleteMany({
    where: { questionId: target.id },
  });
  console.log(`  Deleted ${deletedResponses.count} response(s)`);

  // Delete the question
  await prisma.applicationQuestion.delete({
    where: { id: target.id },
  });
  console.log("  Question deleted successfully.");
}

void main()
  .catch((error: unknown) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
