import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting to seed mentor questions...");

  // Get the residency event
  const event = await prisma.event.findUnique({
    where: { id: "funding-commons-residency-2025" },
  });

  if (!event) {
    console.error(
      "❌ Event funding-commons-residency-2025 not found. Please run main seed first.",
    );
    return;
  }

  // Mentor onboarding questions - starting from order 1000 to avoid conflicts with participant questions
  const mentorQuestions = [
    // Contact & Logistics Section
    {
      questionKey: "mentor_full_name",
      questionEn: "First and last legal name (as in passport)",
      questionEs: "Nombre y apellido (como en tu pasaporte)",
      questionType: "TEXT" as const,
      required: true,
      order: 1001,
    },
    {
      questionKey: "mentor_phone",
      questionEn: "Phone",
      questionEs: "Teléfono",
      questionType: "PHONE" as const,
      required: true,
      order: 1002,
    },
    {
      questionKey: "mentor_telegram",
      questionEn: "Telegram",
      questionEs: "Telegram",
      questionType: "TEXT" as const,
      required: true,
      order: 1003,
    },
    {
      questionKey: "mentor_email",
      questionEn: "Email",
      questionEs: "Correo electrónico",
      questionType: "EMAIL" as const,
      required: true,
      order: 1004,
    },
    {
      questionKey: "mentor_visa_letter",
      questionEn: "Do you need a visa letter?",
      questionEs: "¿Necesitas una carta de invitación para la visa?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes / Sí", "No"],
      order: 1005,
    },

    // Emergency Contact Section
    {
      questionKey: "mentor_emergency_name",
      questionEn: "Emergency Contact - Name",
      questionEs: "Contacto de Emergencia - Nombre",
      questionType: "TEXT" as const,
      required: true,
      order: 1006,
    },
    {
      questionKey: "mentor_emergency_relationship",
      questionEn: "Emergency Contact - Relationship",
      questionEs: "Contacto de Emergencia - Relación",
      questionType: "TEXT" as const,
      required: true,
      order: 1007,
    },
    {
      questionKey: "mentor_emergency_phone",
      questionEn: "Emergency Contact - Phone",
      questionEs: "Contacto de Emergencia - Teléfono",
      questionType: "PHONE" as const,
      required: true,
      order: 1008,
    },

    // Food & Dietary Needs Section
    {
      questionKey: "mentor_dietary_preferences",
      questionEn: "Food & Dietary Needs",
      questionEs: "Comida y Preferencias Alimentarias",
      questionType: "MULTISELECT" as const,
      required: true,
      options: [
        "Omnivore / Omnívoro",
        "Vegetarian / Vegetariano",
        "Vegan / Vegano",
        "Other / Otro",
      ],
      order: 1009,
    },
    {
      questionKey: "mentor_dietary_other",
      questionEn: "If you selected 'Other' above, please specify",
      questionEs: "Si seleccionaste 'Otro' arriba, por favor especifica",
      questionType: "TEXT" as const,
      required: false,
      order: 1010,
    },
    {
      questionKey: "mentor_allergies",
      questionEn: "Allergies or intolerances",
      questionEs: "Alergias o intolerancias",
      questionType: "TEXTAREA" as const,
      required: false,
      order: 1011,
    },

    // Mentorship & Skills Section
    {
      questionKey: "mentor_skills_experience",
      questionEn:
        "What knowledge, skills, or experience can you share with participants?",
      questionEs:
        "¿Qué conocimientos, habilidades o experiencias puedes compartir con los participantes?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 1012,
    },
    {
      questionKey: "mentor_mentoring_type",
      questionEn: "Are you open to mentoring one-on-one, in groups, or both?",
      questionEs: "¿Estás abierto/a a mentoría individual, grupal, o ambas?",
      questionType: "MULTISELECT" as const,
      required: true,
      options: ["One-on-one / Individual", "Group / Grupal", "Both / Ambas"],
      order: 1013,
    },
    {
      questionKey: "mentor_community_connections",
      questionEn:
        "Are there people or organizations you think we should connect with to strengthen the community?",
      questionEs:
        "¿Hay personas u organizaciones con las que crees que deberíamos conectarnos para fortalecer la comunidad?",
      questionType: "TEXTAREA" as const,
      required: false,
      order: 1014,
    },

    // Workshops or Sessions Section
    {
      questionKey: "mentor_workshop_title",
      questionEn: "Workshop Title",
      questionEs: "Título del Taller",
      questionType: "TEXT" as const,
      required: false,
      order: 1015,
    },
    {
      questionKey: "mentor_workshop_description",
      questionEn: "Workshop Description",
      questionEs: "Descripción del Taller",
      questionType: "TEXTAREA" as const,
      required: false,
      order: 1016,
    },
    {
      questionKey: "mentor_workshop_duration",
      questionEn: "Workshop Duration",
      questionEs: "Duración del Taller",
      questionType: "TEXT" as const,
      required: false,
      order: 1017,
    },
    {
      questionKey: "mentor_workshop_materials",
      questionEn: "Materials/setup needed",
      questionEs: "Materiales/configuración necesaria",
      questionType: "TEXTAREA" as const,
      required: false,
      order: 1018,
    },

    // Media & Bio Section
    {
      questionKey: "mentor_headshot_url",
      questionEn:
        "Headshot URL (upload your photo somewhere and provide the link)",
      questionEs:
        "URL de foto tipo retrato (sube tu foto en algún lugar y proporciona el enlace)",
      questionType: "URL" as const,
      required: false,
      order: 1019,
    },
    {
      questionKey: "mentor_bio",
      questionEn: "Short bio or description",
      questionEs: "Breve biografía o descripción",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 1020,
    },

    // Final Confirmations Section
    {
      questionKey: "mentor_liability_waiver",
      questionEn:
        "I have read the Residency Liability Waiver and consent to documentation (photos/videos) for program purposes.",
      questionEs:
        "He leído la Exención de Responsabilidad de la Residencia y consiento la documentación (fotos/videos) para propósitos del programa.",
      questionType: "CHECKBOX" as const,
      required: true,
      order: 1021,
    },
    {
      questionKey: "mentor_code_of_conduct",
      questionEn: "I agree to follow the residency's Code of Conduct.",
      questionEs: "Acepto seguir el Código de Conducta de la residencia.",
      questionType: "CHECKBOX" as const,
      required: true,
      order: 1022,
    },
    {
      questionKey: "mentor_community_activities",
      questionEn:
        "I understand my participation includes contributing to community activities.",
      questionEs:
        "Entiendo que mi participación incluye contribuir a actividades comunitarias.",
      questionType: "CHECKBOX" as const,
      required: true,
      order: 1023,
    },
    {
      questionKey: "mentor_signature",
      questionEn: "Digital Signature (type your full name)",
      questionEs: "Firma Digital (escribe tu nombre completo)",
      questionType: "TEXT" as const,
      required: true,
      order: 1024,
    },
  ];

  console.log(`📝 Creating ${mentorQuestions.length} mentor questions...`);

  for (const questionData of mentorQuestions) {
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
        options: questionData.options ?? [],
        order: questionData.order,
      },
      create: {
        eventId: event.id,
        questionKey: questionData.questionKey,
        questionEn: questionData.questionEn,
        questionEs: questionData.questionEs,
        questionType: questionData.questionType,
        required: questionData.required,
        options: questionData.options ?? [],
        order: questionData.order,
      },
    });
    console.log(`✅ Created/updated question: ${question.questionKey}`);
  }

  console.log("🎉 Mentor questions seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding mentor questions:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
