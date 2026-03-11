import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting to seed IATF speaker application questions...");

  // Get the Intelligence at the Frontier event
  const event = await prisma.event.findFirst({
    where: { slug: "intelligence-at-the-frontier" },
  });

  if (!event) {
    console.error("❌ Event intelligence-at-the-frontier not found.");
    return;
  }

  // Speaker application questions - starting from order 2001 to avoid conflicts
  const speakerQuestions = [
    // Community Questions (optional)
    {
      questionKey: "speaker_industry_tenure",
      questionEn: "How long have you been in your industry?",
      questionEs: "How long have you been in your industry?",
      questionType: "SELECT" as const,
      required: true,
      options: ["1-5 years", "6-14 years", "15+ years"],
      order: 2001,
    },
    {
      questionKey: "speaker_role_identity",
      questionEn: "Which one of the following best describes you?",
      questionEs: "Which one of the following best describes you?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Builder", "Researcher", "Funder", "Creative", "Policy-Maker"],
      order: 2002,
    },
    {
      questionKey: "speaker_symbol_metaphor",
      questionEn:
        "If you could choose a symbol or metaphor for public goods, what would it be?",
      questionEs:
        "If you could choose a symbol or metaphor for public goods, what would it be?",
      questionType: "TEXT" as const,
      required: false,
      options: [],
      order: 2003,
    },
    {
      questionKey: "speaker_big_idea",
      questionEn: "What's a big idea you can't stop thinking about lately?",
      questionEs: "What's a big idea you can't stop thinking about lately?",
      questionType: "TEXTAREA" as const,
      required: false,
      options: [],
      order: 2004,
    },
    {
      questionKey: "speaker_upbringing_public_goods",
      questionEn:
        "How has where you grew up shaped your understanding of public goods?",
      questionEs:
        "How has where you grew up shaped your understanding of public goods?",
      questionType: "TEXTAREA" as const,
      required: false,
      options: [],
      order: 2005,
    },
    {
      questionKey: "speaker_recent_book",
      questionEn:
        "What's the most recent book you've read and would recommend?",
      questionEs:
        "What's the most recent book you've read and would recommend?",
      questionType: "TEXT" as const,
      required: false,
      options: [],
      order: 2006,
    },
    {
      questionKey: "speaker_dream_collaborator",
      questionEn:
        "Who's someone you'd love to collaborate with to build better systems for the commons?",
      questionEs:
        "Who's someone you'd love to collaborate with to build better systems for the commons?",
      questionType: "TEXT" as const,
      required: false,
      options: [],
      order: 2007,
    },
  ];

  console.log(
    `📝 Creating ${speakerQuestions.length} speaker questions for ${event.name}...`,
  );

  for (const questionData of speakerQuestions) {
    const question = await prisma.applicationQuestion.upsert({
      where: {
        eventId_questionKey: {
          eventId: event.id,
          questionKey: questionData.questionKey,
        },
      },
      update: {
        questionEn: questionData.questionEn,
        questionEs: questionData.questionEs,
        questionType: questionData.questionType,
        required: questionData.required,
        options: questionData.options,
        order: questionData.order,
      },
      create: {
        eventId: event.id,
        questionKey: questionData.questionKey,
        questionEn: questionData.questionEn,
        questionEs: questionData.questionEs,
        questionType: questionData.questionType,
        required: questionData.required,
        options: questionData.options,
        order: questionData.order,
      },
    });
    console.log(`✅ Created/updated question: ${question.questionKey}`);
  }

  console.log("🎉 IATF speaker questions seeded successfully!");
}

void main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding IATF speaker questions:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
