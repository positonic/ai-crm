import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating IATF "About You" questions...');

  // Get the Intelligence at the Frontier event (try slug, then name)
  let event = await prisma.event.findFirst({
    where: { slug: "intelligence-at-the-frontier" },
  });
  event ??= await prisma.event.findFirst({
    where: { name: { contains: "Intelligence", mode: "insensitive" } },
  });

  if (!event) {
    console.error(
      '❌ Event "Intelligence at the Frontier" not found. Available events:',
    );
    const events = await prisma.event.findMany({
      select: { id: true, name: true, slug: true },
    });
    for (const e of events) {
      console.error(`   - ${e.name} (slug: ${e.slug}, id: ${e.id})`);
    }
    return;
  }

  console.log(`📌 Found event: ${event.name} (${event.id})`);

  // 1. Delete "What is your full name?" and "What is your email address?" questions
  const deleteResult = await prisma.applicationQuestion.deleteMany({
    where: {
      eventId: event.id,
      questionKey: { in: ["full_name", "email"] },
    },
  });
  console.log(
    `🗑️  Deleted ${deleteResult.count} question(s) (full_name, email)`,
  );

  // 2. Add "How did you hear about this event?" question
  const howHeard = await prisma.applicationQuestion.upsert({
    where: {
      eventId_questionKey: {
        eventId: event.id,
        questionKey: "how_heard",
      },
    },
    update: {
      questionEn: "How did you hear about this event?",
      questionEs: "How did you hear about this event?",
      questionType: "TEXTAREA",
      required: false,
      options: [],
      order: 3,
    },
    create: {
      eventId: event.id,
      questionKey: "how_heard",
      questionEn: "How did you hear about this event?",
      questionEs: "How did you hear about this event?",
      questionType: "TEXTAREA",
      required: false,
      options: [],
      order: 3,
    },
  });
  console.log(`✅ Created/updated question: ${howHeard.questionKey}`);

  // Show final state of questions for verification
  const allQuestions = await prisma.applicationQuestion.findMany({
    where: { eventId: event.id },
    orderBy: { order: "asc" },
    select: { questionKey: true, questionEn: true, order: true },
  });
  console.log("\n📋 Current questions for this event:");
  for (const q of allQuestions) {
    console.log(`   [${q.order}] ${q.questionKey}: ${q.questionEn}`);
  }

  console.log("\n🎉 Done!");
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
