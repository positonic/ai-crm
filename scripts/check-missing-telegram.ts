import { db } from "~/server/db";

async function checkMissingTelegram() {
  const eventId = "funding-commons-residency-2025";
  const telegramQuestionId = "cmeh86ive000suo43k2edx15q";
  const fullNameQuestionId = "cmeh86ipf000guo436knsqluc";

  // Get all accepted applications
  const acceptedApplications = await db.application.findMany({
    where: {
      eventId,
      status: "ACCEPTED",
    },
    include: {
      responses: {
        include: {
          question: true,
        },
      },
    },
  });

  console.log(`Total accepted applications: ${acceptedApplications.length}`);

  // Check which ones don't have telegram
  const missingTelegram = [];

  for (const app of acceptedApplications) {
    // Find telegram response
    const telegramResponse = app.responses.find(
      (r) => r.questionId === telegramQuestionId,
    );
    const nameResponse = app.responses.find(
      (r) => r.questionId === fullNameQuestionId,
    );

    const hasTelegram =
      telegramResponse?.answer && telegramResponse.answer.trim() !== "";

    if (!hasTelegram) {
      missingTelegram.push({
        email: app.email,
        name: nameResponse?.answer ?? "Unknown",
        applicationId: app.id,
        telegramAnswer: telegramResponse?.answer ?? "(no answer)",
      });
    }
  }

  console.log(
    `\nAccepted applicants WITHOUT telegram (${missingTelegram.length}):`,
  );
  console.log("=".repeat(80));

  missingTelegram.forEach((person, index) => {
    console.log(`${index + 1}. ${person.name}`);
    console.log(`   Email: ${person.email}`);
    console.log(`   Application ID: ${person.applicationId}`);
    console.log(`   Telegram Answer: ${person.telegramAnswer}`);
    console.log("");
  });

  console.log(`\nSummary:`);
  console.log(`- Total accepted: ${acceptedApplications.length}`);
  console.log(
    `- With telegram: ${acceptedApplications.length - missingTelegram.length}`,
  );
  console.log(`- Without telegram: ${missingTelegram.length}`);

  await db.$disconnect();
}

checkMissingTelegram().catch(console.error);
