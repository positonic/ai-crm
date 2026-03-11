import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function removeDuplicateQuestion() {
  console.log("🗑️ Removing duplicate question...");

  try {
    // Find the duplicate question
    const duplicateQuestion = await prisma.applicationQuestion.findFirst({
      where: {
        questionKey: "fully_available",
        eventId: "funding-commons-residency-2025",
      },
    });

    if (duplicateQuestion) {
      // First, delete any responses to this question
      const deletedResponses = await prisma.applicationResponse.deleteMany({
        where: {
          questionId: duplicateQuestion.id,
        },
      });

      console.log(
        `✅ Deleted ${deletedResponses.count} responses to duplicate question`,
      );

      // Then delete the question itself
      await prisma.applicationQuestion.delete({
        where: {
          id: duplicateQuestion.id,
        },
      });

      console.log(
        '✅ Deleted duplicate question: "Are you fully available for the duration of the residency?"',
      );
    } else {
      console.log("ℹ️ No duplicate question found");
    }

    console.log("🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error removing duplicate question:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function directly
removeDuplicateQuestion().catch(console.error);
