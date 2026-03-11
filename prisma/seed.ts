import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const initialSponsors = [
  { name: "Aave", websiteUrl: "https://aave.com", logoUrl: null },
  { name: "ENS", websiteUrl: "https://ens.domains", logoUrl: null },
  { name: "Logos", websiteUrl: "https://logos.co", logoUrl: null },
  { name: "Octant", websiteUrl: "https://octant.app", logoUrl: null },
  { name: "Gitcoin", websiteUrl: "https://gitcoin.co", logoUrl: null },
  { name: "Hats", websiteUrl: "https://hats.finance", logoUrl: null },
  { name: "Stellar", websiteUrl: "https://stellar.org", logoUrl: null },
  { name: "Masa", websiteUrl: "https://masa.finance", logoUrl: null },
];

async function main() {
  console.log("🌱 Starting to seed database...");

  // Create a default user for event creation
  const defaultUser = await prisma.user.upsert({
    where: { email: "admin@realfi.com" },
    update: {},
    create: {
      email: "admin@realfi.com",
      name: "RealFi Admin",
      role: "admin",
    },
  });
  console.log(`✅ Created/updated user: ${defaultUser.name}`);

  // Create Elinor Ostrom AI reviewer
  const elinorOstrom = await prisma.user.upsert({
    where: { email: "ostrom@fundingthecommons.io" },
    update: {},
    create: {
      email: "ostrom@fundingthecommons.io",
      name: "Elinor Ostrom",
      role: "admin",
      isAIReviewer: true,
    },
  });
  console.log(`✅ Created/updated AI reviewer: ${elinorOstrom.name}`);

  // Create sponsors
  for (const sponsorData of initialSponsors) {
    const sponsor = await prisma.sponsor.upsert({
      where: { name: sponsorData.name },
      update: {
        websiteUrl: sponsorData.websiteUrl,
        logoUrl: sponsorData.logoUrl,
      },
      create: {
        name: sponsorData.name,
        websiteUrl: sponsorData.websiteUrl,
        logoUrl: sponsorData.logoUrl,
      },
    });
    console.log(`✅ Created/updated sponsor: ${sponsor.name}`);
  }

  // Create default roles for invitation system
  const defaultRoles = [
    {
      name: "sponsor",
      description: "Event sponsor with access to sponsor areas",
    },
    {
      name: "mentor",
      description: "Event mentor providing guidance to participants",
    },
    { name: "judge", description: "Event judge for evaluating submissions" },
    {
      name: "organizer",
      description: "Event organizer with management permissions",
    },
    { name: "speaker", description: "Event speaker or presenter" },
    {
      name: "volunteer",
      description: "Event volunteer helping with operations",
    },
    { name: "participant", description: "General event participant" },
  ];

  console.log("🌱 Creating default roles...");
  for (const roleData of defaultRoles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        name: roleData.name,
      },
    });
    console.log(`✅ Created/updated role: ${role.name}`);
  }

  // Create RealFi event
  const realFiEvent = await prisma.event.upsert({
    where: { id: "realfi-hackathon-2025" },
    update: {
      name: "RealFi Hackathon",
      slug: "realfi-hackathon-2025",
      description:
        "A hackathon focused on real-world financial applications using blockchain technology",
      type: "HACKATHON",
      isOnline: false,
      location: "San Francisco, CA",
    },
    create: {
      id: "realfi-hackathon-2025",
      slug: "realfi-hackathon-2025",
      name: "RealFi Hackathon",
      description:
        "A hackathon focused on real-world financial applications using blockchain technology",
      startDate: new Date("2025-09-15T09:00:00Z"),
      endDate: new Date("2025-09-17T18:00:00Z"),
      type: "HACKATHON",
      isOnline: false,
      location: "San Francisco, CA",
      createdById: defaultUser.id,
    },
  });
  console.log(`✅ Created/updated event: ${realFiEvent.name}`);

  // Create EventSponsor relationships for Aave, ENS, and Logos
  const targetSponsors = ["Aave", "ENS", "Logos"];

  for (const sponsorName of targetSponsors) {
    const sponsor = await prisma.sponsor.findUnique({
      where: { name: sponsorName },
    });

    if (sponsor) {
      await prisma.eventSponsor.upsert({
        where: {
          eventId_sponsorId: {
            eventId: realFiEvent.id,
            sponsorId: sponsor.id,
          },
        },
        update: {},
        create: {
          eventId: realFiEvent.id,
          sponsorId: sponsor.id,
        },
      });
      console.log(
        `✅ Created/updated EventSponsor relationship: ${sponsorName} -> ${realFiEvent.name}`,
      );
    } else {
      console.log(
        `⚠️  Sponsor ${sponsorName} not found, skipping EventSponsor creation`,
      );
    }
  }

  // Create Residency event
  const residencyEvent = await prisma.event.upsert({
    where: { id: "funding-commons-residency-2025" },
    update: {
      name: "Funding the Commons Residency",
      slug: "funding-commons-residency-2025",
      description:
        "Intensive residency program for selected participants to work on projects and build connections in the public goods and climate funding ecosystem.",
      type: "RESIDENCY",
      isOnline: false,
      location: "Buenos Aires, Argentina",
    },
    create: {
      id: "funding-commons-residency-2025",
      slug: "funding-commons-residency-2025",
      name: "Funding the Commons Residency",
      description:
        "Intensive residency program for selected participants to work on projects and build connections in the public goods and climate funding ecosystem.",
      startDate: new Date("2025-10-24T09:00:00Z"),
      endDate: new Date("2025-11-14T18:00:00Z"),
      type: "RESIDENCY",
      isOnline: false,
      location: "Buenos Aires, Argentina",
      createdById: defaultUser.id,
    },
  });
  console.log(`✅ Created/updated event: ${residencyEvent.name}`);

  // Create EAS attestation test data using real BA residency project: Relay Funder
  // See: https://platform.fundingthecommons.io/projects/cmh6h40lp0009jy04kojg7qhf
  console.log(
    "🌱 Creating EAS test project (Relay Funder from BA residency)...",
  );

  // Create user (Sara Johnstone - Relay Funder founder)
  const relayFunderUser = await prisma.user.upsert({
    where: { email: "sara@relayfunder.com" },
    update: {},
    create: {
      email: "sara@relayfunder.com",
      name: "Sara Johnstone",
    },
  });
  console.log(`✅ Created/updated user: ${relayFunderUser.name}`);

  // Create profile
  const relayFunderProfile = await prisma.userProfile.upsert({
    where: { userId: relayFunderUser.id },
    update: {
      bio: "Founder/CEO at Relay Funder. Web3 professional with experience in climate, regenerative finance, and impact spaces.",
      location: "Colorado",
      isPublic: true,
    },
    create: {
      userId: relayFunderUser.id,
      bio: "Founder/CEO at Relay Funder. Web3 professional with experience in climate, regenerative finance, and impact spaces.",
      location: "Colorado",
      isPublic: true,
    },
  });
  console.log(`✅ Created/updated profile for: ${relayFunderUser.name}`);

  // Create Relay Funder project
  const relayFunderProject = await prisma.userProject.upsert({
    where: { id: "relay-funder-eas-test" },
    update: {
      title: "Relay Funder",
      description:
        "Crowdfunding infrastructure for refugee communities to deliver higher capital efficiency and direct, transparent aid.",
    },
    create: {
      id: "relay-funder-eas-test",
      profileId: relayFunderProfile.id,
      title: "Relay Funder",
      description:
        "Crowdfunding infrastructure for refugee communities to deliver higher capital efficiency and direct, transparent aid.",
      createdAt: new Date("2025-10-25T00:00:00.000Z"),
    },
  });
  console.log(`✅ Created/updated project: ${relayFunderProject.title}`);

  // Create repository pointing to real GitHub repo
  const relayFunderRepo = await prisma.repository.upsert({
    where: { id: "relay-funder-repo-eas-test" },
    update: {
      url: "https://github.com/relay-funder/relay-funder-app",
      name: "relay-funder-app",
      isPrimary: true,
      totalCommits: 100,
      isActive: true,
      weeksActive: 3,
      lastCommitDate: new Date("2025-11-14T00:00:00.000Z"),
      firstCommitDate: new Date("2025-11-11T00:00:00.000Z"),
      lastSyncedAt: new Date(),
    },
    create: {
      id: "relay-funder-repo-eas-test",
      projectId: relayFunderProject.id,
      url: "https://github.com/relay-funder/relay-funder-app",
      name: "relay-funder-app",
      isPrimary: true,
      totalCommits: 100,
      isActive: true,
      weeksActive: 3,
      lastCommitDate: new Date("2025-11-14T00:00:00.000Z"),
      firstCommitDate: new Date("2025-11-11T00:00:00.000Z"),
      lastSyncedAt: new Date(),
    },
  });
  console.log(`✅ Created/updated repository: ${relayFunderRepo.name}`);

  // Create residency metrics with real commit data from BA residency period
  // Data fetched from GitHub API for Oct 24 - Nov 14, 2025
  const relayFunderMetrics = await prisma.repositoryResidencyMetrics.upsert({
    where: {
      repositoryId_eventId: {
        repositoryId: relayFunderRepo.id,
        eventId: residencyEvent.id,
      },
    },
    update: {
      residencyCommits: 100,
      residencyStartDate: new Date("2025-10-24T00:00:00.000Z"),
      residencyEndDate: new Date("2025-11-14T23:59:59.000Z"),
      commitsData: [
        { date: "2025-11-11", count: 43 },
        { date: "2025-11-12", count: 33 },
        { date: "2025-11-13", count: 3 },
        { date: "2025-11-14", count: 21 },
      ],
      lastSyncedAt: new Date(),
    },
    create: {
      repositoryId: relayFunderRepo.id,
      eventId: residencyEvent.id,
      residencyCommits: 100,
      residencyStartDate: new Date("2025-10-24T00:00:00.000Z"),
      residencyEndDate: new Date("2025-11-14T23:59:59.000Z"),
      commitsData: [
        { date: "2025-11-11", count: 43 },
        { date: "2025-11-12", count: 33 },
        { date: "2025-11-13", count: 3 },
        { date: "2025-11-14", count: 21 },
      ],
      lastSyncedAt: new Date(),
    },
  });
  console.log(
    `✅ Created/updated residency metrics for: ${relayFunderRepo.name} (${relayFunderMetrics.residencyCommits} commits)`,
  );

  // Create John X user as accepted resident
  console.log("🌱 Creating John X user as accepted resident...");

  const johnxUser = await prisma.user.upsert({
    where: { email: "john@johnx.co" },
    update: {},
    create: {
      email: "john@johnx.co",
      name: "John X",
    },
  });
  console.log(`✅ Created/updated user: ${johnxUser.name}`);

  // Create accepted application for John X
  const johnxApplication = await prisma.application.upsert({
    where: {
      userId_eventId: {
        userId: johnxUser.id,
        eventId: residencyEvent.id,
      },
    },
    update: {
      status: "ACCEPTED",
    },
    create: {
      userId: johnxUser.id,
      eventId: residencyEvent.id,
      email: "john@johnx.co",
      status: "ACCEPTED",
    },
  });
  console.log(
    `✅ Created/updated application for ${johnxUser.name}: ${johnxApplication.status}`,
  );

  // Get participant role and assign to John X
  const participantRole = await prisma.role.findUnique({
    where: { name: "participant" },
  });

  if (participantRole) {
    await prisma.userRole.upsert({
      where: {
        userId_eventId_roleId: {
          userId: johnxUser.id,
          eventId: residencyEvent.id,
          roleId: participantRole.id,
        },
      },
      update: {},
      create: {
        userId: johnxUser.id,
        eventId: residencyEvent.id,
        roleId: participantRole.id,
      },
    });
    console.log(
      `✅ Assigned ${johnxUser.name} as participant in ${residencyEvent.name}`,
    );
  }

  // Create application questions for residency
  const residencyQuestions = [
    {
      questionKey: "full_name",
      questionEn: "First and last legal name as listed on your passport",
      questionEs: "Nombre y apellido como aparece en tu pasaporte",
      questionType: "TEXT" as const,
      required: true,
      order: 1,
    },
    {
      questionKey: "email",
      questionEn: "Email",
      questionEs: "Correo electrónico",
      questionType: "EMAIL" as const,
      required: true,
      order: 2,
    },
    {
      questionKey: "nationality",
      questionEn: "What is your nationality?",
      questionEs: "¿Cuál es tu nacionalidad?",
      questionType: "TEXT" as const,
      required: true,
      order: 3,
    },
    {
      questionKey: "twitter",
      questionEn: "Twitter",
      questionEs: "Twitter",
      questionType: "URL" as const,
      required: false,
      order: 4,
    },
    {
      questionKey: "github",
      questionEn: "GitHub",
      questionEs: "GitHub",
      questionType: "URL" as const,
      required: false,
      order: 5,
    },
    {
      questionKey: "linkedin",
      questionEn: "LinkedIn",
      questionEs: "LinkedIn",
      questionType: "URL" as const,
      required: false,
      order: 6,
    },
    {
      questionKey: "telegram",
      questionEn: "Telegram",
      questionEs: "Telegram",
      questionType: "TEXT" as const,
      required: true,
      order: 7,
    },
    {
      questionKey: "program_availability",
      questionEn:
        "Will you be able to attend the full program from October 24th through November 14th?",
      questionEs:
        "¿Estarás disponible durante todo el tiempo que duré la residencia?",
      questionType: "SELECT" as const,
      required: true,
      options: [
        "Yes, I can attend the full program",
        "I might miss a week or two",
        "I'm not sure yet",
      ],
      order: 8,
    },
    {
      questionKey: "project_description",
      questionEn: "What do you want to build during the residency?",
      questionEs: "¿Qué proyecto quieres desarrollar durante la residencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 9,
    },
    {
      questionKey: "prior_experience",
      questionEn:
        "What is your prior experience with cryptography/currency, decentralized technologies, and/or climate, and public goods funding systems?",
      questionEs:
        "Cuéntanos más sobre tu experiencia en criptografía, criptomonedas, tecnologías descentralizadas y/o sistemas de financiación de bienes públicos.",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 10,
    },
    {
      questionKey: "financial_support",
      questionEn: "Do you need financial support to attend the residency?",
      questionEs: "¿Necesitas apoyo financiero para atender la residencia?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No", "Partial support"],
      order: 11,
    },
    {
      questionKey: "visa_needed",
      questionEn: "Do you need a visa?",
      questionEs: "¿Necesitas visa?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No"],
      order: 12,
    },
    {
      questionKey: "terms_agreement",
      questionEn: "Do you agree to our terms and conditions?",
      questionEs: "¿Aceptas nuestros términos y condiciones?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No"],
      order: 13,
    },
    {
      questionKey: "commitments",
      questionEn:
        "What, if any, commitments (e.g. work/spouse/family) do you have that would make committing to the residency difficult?",
      questionEs:
        "¿Qué compromisos, si es que tienes alguno (trabajo, pareja, familia), podrían dificultarte comprometerte a atender la residencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 14,
    },
    {
      questionKey: "how_heard",
      questionEn:
        "How did you hear about this program? If you were referred by someone, please tell us who.",
      questionEs:
        "¿Cómo te enteraste del programa? Si alguien te lo recomendó, por favor dinos quién fue.",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 15,
    },
    {
      questionKey: "fully_available",
      questionEn: "Are you fully available for the duration of the residency?",
      questionEs:
        "¿Estás completamente disponible durante toda la duración de la residencia?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No", "Mostly"],
      order: 16,
    },
    {
      questionKey: "technical_skills",
      questionEn:
        "What are your technical skills? Please select all that apply.",
      questionEs:
        "¿Cuáles son tus habilidades técnicas? Por favor, selecciona todas las que apliquen.",
      questionType: "MULTISELECT" as const,
      required: true,
      options: [
        "Designer",
        "Developer",
        "Project Manager",
        "Researcher",
        "Other",
      ],
      order: 17,
    },
    {
      questionKey: "technical_skills_other",
      questionEn:
        "If you answered 'other' in the previous question, please specify here. If you did not select 'other,' please answer with N/A.",
      questionEs:
        'Si respondiste "otro" en la pregunta anterior, por favor da más detalle. Si no seleccionaste "otro", responde con N/A.',
      questionType: "TEXT" as const,
      required: true,
      order: 18,
    },
    {
      questionKey: "skill_rating",
      questionEn:
        "On a scale of 1-10, 1 being a beginner, 5 being very confident about the skill, and 10 being world-class expert, how would you rate the technical skills you chose for the last two questions?",
      questionEs:
        "En una escala del 1 al 10, donde 1 es principiante, 5 es tener buen manejo y 10 es ser experto, ¿cómo calificarías las habilidades técnicas que marcaste en las dos preguntas anteriores?",
      questionType: "NUMBER" as const,
      required: true,
      order: 19,
    },
    {
      questionKey: "open_source_experience",
      questionEn:
        "Tell us about a time when you contributed to a collaborative or open-source effort. What did you learn?",
      questionEs:
        "Dime de alguna vez en la que tuviste que contribuir a una iniciativa de open-source. ¿Qué aprendiste?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 20,
    },
    {
      questionKey: "funding_commons_meaning",
      questionEn:
        "What does 'funding the commons' mean to you, and why is it important?",
      questionEs:
        '¿Qué significa para ti "funding the commons" y por qué es importante?',
      questionType: "TEXTAREA" as const,
      required: true,
      order: 21,
    },
    {
      questionKey: "public_goods_motivation",
      questionEn:
        "What motivates you to contribute to the public goods ecosystem?",
      questionEs:
        "¿Qué te motiva a construir y contribuir en el ecosistema de Public Goods (Bienes Públicos)?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 22,
    },
    {
      questionKey: "realfi_interest",
      questionEn:
        "Are you currently working on—or interested in building—real-fi solutions (solutions for the real world)? Please elaborate.",
      questionEs:
        "¿Actualmente estás trabajando o te interesaría trabajar en soluciones RealFi (para el mundo real)? Por favor describe.",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 23,
    },
    {
      questionKey: "privacy_tools",
      questionEn:
        "Do privacy-preserving tools or protocols play a role in your work? If so, how?",
      questionEs:
        "¿Las herramientas o protocolos que preservan la privacidad juegan un rol en tu trabajo? Si es así, ¿cómo?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 24,
    },
    {
      questionKey: "funding_mechanisms",
      questionEn:
        "Have you experimented with or proposed new public goods funding mechanisms (e.g. quadratic funding, retroPGF, hypercerts)? Tell us more.",
      questionEs:
        "¿Has experimentado con o propuesto nuevos mecanismos de financiamiento para Public Goods (por ejemplo, quadratic funding, retroPGF, hypercerts)? Cuéntanos más.",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 25,
    },
    {
      questionKey: "impact_measurement",
      questionEn:
        "How do you think we should measure the impact of public goods?",
      questionEs:
        "En tu opinión, ¿cómo debería medirse el impacto de los Public Goods (Bienes Públicos)?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 26,
    },
    {
      questionKey: "connections_sought",
      questionEn:
        "What kind of people or expertise are you hoping to connect with during the residency?",
      questionEs:
        "¿Con qué tipo de personas o conocimientos te gustaría conectar durante la residencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 27,
    },
    {
      questionKey: "cohort_contribution",
      questionEn: "What can you offer to others in the cohort?",
      questionEs:
        "¿Qué puedes ofrecer a tus demás compañeros en esta edición de la residencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 28,
    },
    {
      questionKey: "intro_video_link",
      questionEn:
        "Please include a one-minute introduction video. You can upload it here, or share a private YouTube or Loom link below.",
      questionEs:
        "Por favor, incluye un video de presentación de un minuto. Puedes subirlo aquí o compartir un enlace privado de YouTube or Loom abajo.",
      questionType: "URL" as const,
      required: true,
      order: 29,
    },
    {
      questionKey: "additional_info",
      questionEn: "Is there anything else you want us to know about you?",
      questionEs: "¿Hay algo más que quieras contarnos sobre ti?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 30,
    },
    {
      questionKey: "newsletter_subscription",
      questionEn: "Do you want to subscribe to our newsletter?",
      questionEs: "¿Te quieres suscribir a nuestro newsletter?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No"],
      order: 31,
    },
  ];

  console.log("🌱 Creating application questions for residency...");
  for (const questionData of residencyQuestions) {
    await prisma.applicationQuestion.upsert({
      where: {
        eventId_questionKey: {
          eventId: residencyEvent.id,
          questionKey: questionData.questionKey,
        },
      },
      update: questionData,
      create: {
        ...questionData,
        eventId: residencyEvent.id,
      },
    });
    console.log(`✅ Created/updated question: ${questionData.questionKey}`);
  }

  // Create evaluation criteria for residency vetting
  const evaluationCriteria = [
    // Technical Category (20% weight - reduced from 30%)
    {
      name: "Technical Skills Assessment",
      description:
        "Evaluate technical capabilities based on self-reported skills, experience level (1-10), and GitHub/portfolio evidence. Consider depth vs breadth of skills.",
      category: "TECHNICAL" as const,
      weight: 0.08, // 8% of total (reduced from 12%)
      order: 1,
    },
    {
      name: "Open Source & Collaborative Experience",
      description:
        "Assess quality of open source contributions, collaborative work experience, and ability to work in distributed teams based on their story and evidence.",
      category: "TECHNICAL" as const,
      weight: 0.07, // 7% of total (reduced from 10%)
      order: 2,
    },
    {
      name: "Learning & Adaptation Ability",
      description:
        "Evaluate growth mindset, ability to learn new technologies, and adaptability based on their experience descriptions and skill progression.",
      category: "TECHNICAL" as const,
      weight: 0.05, // 5% of total (reduced from 8%)
      order: 3,
    },

    // Project Category (20% weight - reduced from 25%)
    {
      name: "Project Vision & Feasibility",
      description:
        "Assess the clarity, innovation, and feasibility of their proposed residency project. Consider if it's appropriately scoped for the timeframe.",
      category: "PROJECT" as const,
      weight: 0.08, // 8% of total (reduced from 10%)
      order: 4,
    },
    {
      name: "Public Goods & RealFi Alignment",
      description:
        "Evaluate how well their project aligns with public goods funding, RealFi solutions, and the residency's mission. Look for genuine understanding vs surface-level answers.",
      category: "PROJECT" as const,
      weight: 0.07, // 7% of total (reduced from 8%)
      order: 5,
    },
    {
      name: "Impact Potential & Measurement Understanding",
      description:
        "Assess their understanding of impact measurement, realistic expectations for project outcomes, and potential for meaningful contribution to the ecosystem.",
      category: "PROJECT" as const,
      weight: 0.05, // 5% of total (reduced from 7%)
      order: 6,
    },

    // Community Fit Category (20% weight - reduced from 25%)
    {
      name: "Public Goods Ecosystem Understanding",
      description:
        "Evaluate depth of understanding of public goods funding mechanisms, familiarity with the ecosystem, and genuine motivation vs opportunistic interest.",
      category: "COMMUNITY_FIT" as const,
      weight: 0.07, // 7% of total (reduced from 8%)
      order: 7,
    },
    {
      name: "Community Contribution Potential",
      description:
        "Assess what unique value they can bring to the cohort, mentorship abilities, collaborative mindset, and cultural fit with FtC community values.",
      category: "COMMUNITY_FIT" as const,
      weight: 0.08, // 8% of total (reduced from 9%)
      order: 8,
    },
    {
      name: "Commitment & Availability",
      description:
        "Evaluate their commitment level, availability for full program duration, ability to manage competing priorities, and likelihood of completion.",
      category: "COMMUNITY_FIT" as const,
      weight: 0.05, // 5% of total (reduced from 8%)
      order: 9,
    },

    // Video Category (15% weight - reduced from 20%)
    {
      name: "Communication Skills",
      description:
        "Assess clarity of expression, ability to articulate complex ideas, English proficiency, and overall communication effectiveness from the 1-minute video.",
      category: "VIDEO" as const,
      weight: 0.06, // 6% of total (reduced from 8%)
      order: 10,
    },
    {
      name: "Passion & Authenticity",
      description:
        "Evaluate genuine enthusiasm for the mission, authentic interest vs scripted responses, energy level, and personal connection to the work.",
      category: "VIDEO" as const,
      weight: 0.05, // 5% of total (reduced from 7%)
      order: 11,
    },
    {
      name: "Professionalism & Presentation",
      description:
        "Assess video quality, preparation level, time management (staying within 1 minute), and overall professionalism of presentation.",
      category: "VIDEO" as const,
      weight: 0.04, // 4% of total (reduced from 5%)
      order: 12,
    },

    // Entrepreneurial Category (25% weight - new category)
    {
      name: "Leadership & Team Building",
      description:
        "Evaluate track record of leading teams, inspiring others, building collaborative relationships, and ability to guide projects to completion. Look for concrete examples of leadership roles and team management experience.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.08, // 8% of total
      order: 13,
    },
    {
      name: "Business Acumen & Market Understanding",
      description:
        "Assess understanding of market dynamics, business models, go-to-market strategies, and commercial viability. Consider their grasp of the competitive landscape and value proposition articulation.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.07, // 7% of total
      order: 14,
    },
    {
      name: "Execution Track Record",
      description:
        "Analyze history of completing projects, delivering on commitments, overcoming obstacles, and turning ideas into reality. Look for evidence of consistent follow-through and results achievement.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.09, // 9% of total
      order: 15,
    },
    {
      name: "Network & Relationship Building",
      description:
        "Evaluate ability to build meaningful professional relationships, ecosystem connections, and strategic partnerships. Consider quality of references and professional network depth.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.06, // 6% of total
      order: 16,
    },
    {
      name: "Risk Assessment & Calculated Risk-Taking",
      description:
        "Assess balanced approach to risk, evidence of intelligent risk-taking, and ability to make decisions under uncertainty. Look for examples of calculated risks that led to growth or learning.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.07, // 7% of total
      order: 17,
    },
    {
      name: "Resilience & Adaptability",
      description:
        "Evaluate evidence of bouncing back from setbacks, pivoting when needed, learning from failures, and maintaining persistence through challenges. Consider growth mindset and adaptability to changing circumstances.",
      category: "ENTREPRENEURIAL" as const,
      weight: 0.08, // 8% of total
      order: 18,
    },
  ];

  console.log("🌱 Creating evaluation criteria for residency vetting...");
  for (const criteriaData of evaluationCriteria) {
    const criteria = await prisma.evaluationCriteria.upsert({
      where: {
        name: criteriaData.name,
      },
      update: criteriaData,
      create: criteriaData,
    });
    console.log(
      `✅ Created/updated evaluation criteria: ${criteria.name} (${(criteria.weight * 100).toFixed(1)}%)`,
    );
  }

  // Seed common technical skills
  const commonSkills = [
    // Frontend
    { name: "React", category: "Frontend", popularity: 100 },
    { name: "Vue", category: "Frontend", popularity: 80 },
    { name: "Angular", category: "Frontend", popularity: 70 },
    { name: "TypeScript", category: "Frontend", popularity: 95 },
    { name: "JavaScript", category: "Frontend", popularity: 100 },
    { name: "HTML/CSS", category: "Frontend", popularity: 100 },
    { name: "Next.js", category: "Frontend", popularity: 85 },
    { name: "Svelte", category: "Frontend", popularity: 40 },
    { name: "Tailwind CSS", category: "Frontend", popularity: 75 },

    // Backend
    { name: "Node.js", category: "Backend", popularity: 90 },
    { name: "Python", category: "Backend", popularity: 95 },
    { name: "Rust", category: "Backend", popularity: 50 },
    { name: "Go", category: "Backend", popularity: 60 },
    { name: "Java", category: "Backend", popularity: 80 },
    { name: "PHP", category: "Backend", popularity: 70 },
    { name: "Ruby", category: "Backend", popularity: 45 },
    { name: "Express.js", category: "Backend", popularity: 75 },
    { name: "Django", category: "Backend", popularity: 60 },
    { name: "FastAPI", category: "Backend", popularity: 55 },

    // Blockchain
    { name: "Solidity", category: "Blockchain", popularity: 70 },
    { name: "Smart Contracts", category: "Blockchain", popularity: 75 },
    { name: "DeFi", category: "Blockchain", popularity: 65 },
    { name: "Web3", category: "Blockchain", popularity: 80 },
    { name: "Ethereum", category: "Blockchain", popularity: 85 },
    { name: "Web3.js", category: "Blockchain", popularity: 55 },
    { name: "Ethers.js", category: "Blockchain", popularity: 60 },
    { name: "Hardhat", category: "Blockchain", popularity: 45 },
    { name: "Foundry", category: "Blockchain", popularity: 35 },

    // Database
    { name: "PostgreSQL", category: "Database", popularity: 85 },
    { name: "MySQL", category: "Database", popularity: 80 },
    { name: "MongoDB", category: "Database", popularity: 75 },
    { name: "Redis", category: "Database", popularity: 60 },
    { name: "SQLite", category: "Database", popularity: 50 },
    { name: "Prisma", category: "Database", popularity: 70 },
    { name: "Supabase", category: "Database", popularity: 55 },
    { name: "Firebase", category: "Database", popularity: 65 },

    // Design
    { name: "Figma", category: "Design", popularity: 90 },
    { name: "UI/UX", category: "Design", popularity: 85 },
    { name: "Product Design", category: "Design", popularity: 75 },
    { name: "User Research", category: "Design", popularity: 60 },
    { name: "Prototyping", category: "Design", popularity: 70 },
    { name: "Design Systems", category: "Design", popularity: 65 },

    // DevOps
    { name: "Docker", category: "DevOps", popularity: 80 },
    { name: "Kubernetes", category: "DevOps", popularity: 60 },
    { name: "AWS", category: "DevOps", popularity: 85 },
    { name: "GCP", category: "DevOps", popularity: 50 },
    { name: "Azure", category: "DevOps", popularity: 55 },
    { name: "Terraform", category: "DevOps", popularity: 45 },
    { name: "CI/CD", category: "DevOps", popularity: 75 },
    { name: "GitHub Actions", category: "DevOps", popularity: 70 },

    // Mobile
    { name: "React Native", category: "Mobile", popularity: 70 },
    { name: "Flutter", category: "Mobile", popularity: 65 },
    { name: "Swift", category: "Mobile", popularity: 50 },
    { name: "Kotlin", category: "Mobile", popularity: 45 },
    { name: "iOS Development", category: "Mobile", popularity: 60 },
    { name: "Android Development", category: "Mobile", popularity: 60 },

    // Data Science
    { name: "Machine Learning", category: "Data Science", popularity: 70 },
    {
      name: "Artificial Intelligence",
      category: "Data Science",
      popularity: 75,
    },
    { name: "Data Analysis", category: "Data Science", popularity: 65 },
    { name: "Pandas", category: "Data Science", popularity: 50 },
    { name: "NumPy", category: "Data Science", popularity: 45 },
    { name: "TensorFlow", category: "Data Science", popularity: 55 },
    { name: "PyTorch", category: "Data Science", popularity: 60 },

    // Business
    { name: "Project Management", category: "Business", popularity: 80 },
    { name: "Product Management", category: "Business", popularity: 75 },
    { name: "Strategy", category: "Business", popularity: 70 },
    { name: "Business Development", category: "Business", popularity: 65 },
    { name: "Marketing", category: "Business", popularity: 60 },
    { name: "Research", category: "Business", popularity: 75 },
    { name: "Analytics", category: "Business", popularity: 70 },
    { name: "Entrepreneurship", category: "Business", popularity: 65 },
    { name: "Leadership", category: "Business", popularity: 80 },
    { name: "Agile", category: "Business", popularity: 75 },
    { name: "Scrum", category: "Business", popularity: 70 },
  ];

  console.log("🎯 Creating common technical skills...");
  for (const skillData of commonSkills) {
    await prisma.skills.upsert({
      where: { name: skillData.name },
      update: skillData,
      create: skillData,
    });
  }
  console.log(`✅ Created/updated ${commonSkills.length} common skills`);

  // Seed 12 floors (ScheduleVenues) for Intelligence at the Frontier event
  const iatfEvent = await prisma.event.findFirst({
    where: { slug: "intelligence-at-the-frontier" },
  });

  if (iatfEvent) {
    console.log("🏢 Creating floors for Intelligence at the Frontier...");
    const floors = [
      { name: "Floor 14 (Flourishing)", order: 1 },
      { name: "Floor 12 (Ethereum & Decentralized Tech)", order: 2 },
      { name: "Floor 9 (AI & Autonomous Systems)", order: 3 },
      { name: "Floor 8 (Neuro & Biotech)", order: 4 },
      { name: "Floor 7 (Maker Space)", order: 5 },
      { name: "Floor 6 (Arts & Music)", order: 6 },
      { name: "Floor 4 (Robotics & Hard Tech)", order: 7 },
      { name: "Floor 2 (Funding the Commons)", order: 8 },
      { name: "Common Spaces, Lounges, Other", order: 9 },
    ];

    for (const floor of floors) {
      await prisma.scheduleVenue.upsert({
        where: {
          eventId_name: {
            eventId: iatfEvent.id,
            name: floor.name,
          },
        },
        update: { order: floor.order },
        create: {
          eventId: iatfEvent.id,
          name: floor.name,
          order: floor.order,
        },
      });
      console.log(`✅ Created/updated venue: ${floor.name}`);
    }
  } else {
    console.log(
      "⚠️  Intelligence at the Frontier event not found, skipping floor seeding",
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXAMPLE CONFERENCE — Comprehensive demo data
  // ═══════════════════════════════════════════════════════════════════

  console.log(
    "\n🎪 Creating Example Conference with comprehensive demo data...\n",
  );

  // ── 1. Create the Example Conference event ──────────────────────
  const exampleConf = await prisma.event.upsert({
    where: { slug: "example-conf" },
    update: {
      name: "Example Conference",
      description:
        "A showcase conference demonstrating all platform features — schedule management, speaker applications, project tracking, community engagement, and more.",
      startDate: new Date("2026-03-14T09:00:00Z"),
      endDate: new Date("2026-03-15T18:00:00Z"),
      type: "CONFERENCE",
      isOnline: false,
      location: "San Francisco, CA",
      featureApplicantVetting: true,
      featureSpeakerVetting: true,
      featureMentorVetting: true,
      featurePraise: true,
      featureProjects: true,
      featureAsksOffers: true,
      featureNewsfeed: true,
      featureImpactAnalytics: true,
      featureSponsorManagement: true,
      featureScheduleManagement: true,
      featureFloorManagement: true,
    },
    create: {
      slug: "example-conf",
      name: "Example Conference",
      description:
        "A showcase conference demonstrating all platform features — schedule management, speaker applications, project tracking, community engagement, and more.",
      startDate: new Date("2026-03-14T09:00:00Z"),
      endDate: new Date("2026-03-15T18:00:00Z"),
      type: "CONFERENCE",
      isOnline: false,
      location: "San Francisco, CA",
      createdById: defaultUser.id,
      featureApplicantVetting: true,
      featureSpeakerVetting: true,
      featureMentorVetting: true,
      featurePraise: true,
      featureProjects: true,
      featureAsksOffers: true,
      featureNewsfeed: true,
      featureImpactAnalytics: true,
      featureSponsorManagement: true,
      featureScheduleManagement: true,
      featureFloorManagement: true,
    },
  });
  console.log(
    `✅ Created/updated event: ${exampleConf.name} (${exampleConf.slug})`,
  );

  // ── 2. Create demo users with rich profiles ─────────────────────
  const demoUsers = [
    {
      firstName: "Amara",
      surname: "Okafor",
      email: "amara.okafor@demo.example",
      bio: "Full-stack developer and open-source advocate building tools for transparent governance. Previously led engineering at a civic-tech startup in Lagos before moving to the Bay Area.",
      jobTitle: "Senior Engineer",
      company: "Civic Protocol",
      location: "San Francisco, CA",
      skills: ["TypeScript", "React", "Solidity", "Node.js"],
      interests: ["Governance", "Open Source", "DeFi"],
    },
    {
      firstName: "Kai",
      surname: "Tanaka",
      email: "kai.tanaka@demo.example",
      bio: "Researcher studying mechanism design for public goods funding. Published work on quadratic funding variants and retroactive public goods at the intersection of economics and computer science.",
      jobTitle: "Research Lead",
      company: "Funding Futures Lab",
      location: "Tokyo, Japan",
      skills: ["Python", "Data Analysis", "Machine Learning"],
      interests: ["Mechanism Design", "Public Goods", "Economics"],
    },
    {
      firstName: "Elena",
      surname: "Vasquez",
      email: "elena.vasquez@demo.example",
      bio: "UX designer passionate about making decentralised tools accessible. Runs workshops on inclusive design for Web3 products and believes the best interfaces are the ones people forget they are using.",
      jobTitle: "Design Lead",
      company: "Accessible Web3",
      location: "Mexico City, Mexico",
      skills: ["Figma", "UI/UX", "User Research", "Prototyping"],
      interests: ["Accessibility", "Design Systems", "Web3"],
    },
    {
      firstName: "Marcus",
      surname: "Chen",
      email: "marcus.chen@demo.example",
      bio: "Smart contract auditor and security researcher. Has reviewed over 200 DeFi protocols and contributes to open-source security tooling. Firm believer that security is a public good.",
      jobTitle: "Security Researcher",
      company: "ShieldDAO",
      location: "New York, NY",
      skills: ["Solidity", "Rust", "Smart Contracts", "Ethereum"],
      interests: ["Security", "DeFi", "Formal Verification"],
    },
    {
      firstName: "Priya",
      surname: "Sharma",
      email: "priya.sharma@demo.example",
      bio: "Climate tech entrepreneur building on-chain MRV (measurement, reporting, verification) infrastructure. Former environmental scientist who pivoted to blockchain to solve data integrity challenges in carbon markets.",
      jobTitle: "Co-Founder & CEO",
      company: "VeridiChain",
      location: "Berlin, Germany",
      skills: ["Python", "Data Analysis", "Ethereum", "Project Management"],
      interests: ["Climate", "Carbon Markets", "Impact Measurement"],
    },
    {
      firstName: "Liam",
      surname: "Oconnor",
      email: "liam.oconnor@demo.example",
      bio: "Community organiser and governance consultant helping DAOs build sustainable decision-making processes. Spent a decade in cooperative governance before discovering token-based coordination.",
      jobTitle: "Governance Consultant",
      company: "CommonGov",
      location: "Dublin, Ireland",
      skills: ["Strategy", "Leadership", "Agile", "Product Management"],
      interests: ["DAOs", "Governance", "Cooperatives"],
    },
    {
      firstName: "Zara",
      surname: "Mbeki",
      email: "zara.mbeki@demo.example",
      bio: "Protocol engineer working on privacy-preserving identity systems. Contributing to multiple ZK projects and advocating for digital rights in emerging markets.",
      jobTitle: "Protocol Engineer",
      company: "ZK Labs",
      location: "Nairobi, Kenya",
      skills: ["Rust", "Go", "Ethereum", "Hardhat"],
      interests: ["Privacy", "ZK Proofs", "Digital Identity"],
    },
    {
      firstName: "Noah",
      surname: "Kim",
      email: "noah.kim@demo.example",
      bio: "Data scientist and impact evaluator developing frameworks for measuring the effectiveness of public goods funding. Building dashboards that make impact data legible to non-technical stakeholders.",
      jobTitle: "Impact Data Lead",
      company: "Impact Metrics Co",
      location: "Seoul, South Korea",
      skills: ["Python", "Data Analysis", "Machine Learning", "PostgreSQL"],
      interests: ["Impact Measurement", "Data Visualization", "Public Goods"],
    },
    {
      firstName: "Sofia",
      surname: "Andersen",
      email: "sofia.andersen@demo.example",
      bio: "Product manager bridging the gap between technical teams and end users in the regenerative finance space. Previously at a major L2 where she shipped developer tooling used by thousands of builders.",
      jobTitle: "Senior PM",
      company: "RegenStack",
      location: "Copenhagen, Denmark",
      skills: ["Product Management", "Agile", "Scrum", "Analytics"],
      interests: ["ReFi", "Developer Experience", "Product Strategy"],
    },
    {
      firstName: "Ravi",
      surname: "Patel",
      email: "ravi.patel@demo.example",
      bio: "Economist and policy advisor specialising in digital public infrastructure. Advises governments on using blockchain for transparent fund distribution and social safety nets.",
      jobTitle: "Policy Advisor",
      company: "Digital Public Goods Alliance",
      location: "Mumbai, India",
      skills: ["Research", "Strategy", "Analytics", "Project Management"],
      interests: ["Policy", "Digital Public Goods", "Financial Inclusion"],
    },
    {
      firstName: "Maya",
      surname: "Johansson",
      email: "maya.johansson@demo.example",
      bio: "Solidity developer and hackathon veteran who has won prizes at ETHGlobal, Devcon, and multiple FtC events. Currently building cross-chain attestation infrastructure for impact verification.",
      jobTitle: "Smart Contract Developer",
      company: "AttestNet",
      location: "Stockholm, Sweden",
      skills: ["Solidity", "TypeScript", "Hardhat", "Foundry", "Ethers.js"],
      interests: ["Attestations", "Cross-chain", "Hackathons"],
    },
    {
      firstName: "Diego",
      surname: "Morales",
      email: "diego.morales@demo.example",
      bio: "Frontend developer and open-source contributor who maintains several popular Web3 UI libraries. Passionate about developer tooling and making blockchain interactions feel like using any other app.",
      jobTitle: "Frontend Engineer",
      company: "Web3UI",
      location: "Buenos Aires, Argentina",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
      interests: ["Developer Tooling", "Open Source", "Frontend"],
    },
    {
      firstName: "Aisha",
      surname: "Rahman",
      email: "aisha.rahman@demo.example",
      bio: "Documentary filmmaker and multimedia storyteller focused on the human side of decentralised technology. Her short films have screened at Sundance and SXSW, exploring how communities use crypto for resilience.",
      jobTitle: "Creative Director",
      company: "Decentralised Stories",
      location: "London, UK",
      skills: ["Marketing", "Research", "Product Design"],
      interests: ["Storytelling", "Documentary", "Community"],
    },
    {
      firstName: "Felix",
      surname: "Braun",
      email: "felix.braun@demo.example",
      bio: "Infrastructure engineer building reliable node infrastructure for public goods protocols. Operates validators on multiple networks and contributes to client diversity initiatives.",
      jobTitle: "Infrastructure Lead",
      company: "NodeWatch",
      location: "Zurich, Switzerland",
      skills: ["Docker", "Kubernetes", "AWS", "Go", "Terraform"],
      interests: ["Infrastructure", "Validators", "Client Diversity"],
    },
    {
      firstName: "Luna",
      surname: "Park",
      email: "luna.park@demo.example",
      bio: "Legal researcher specialising in DAO legal wrappers and regulatory frameworks for decentralised organisations. Helping projects navigate compliance while preserving the ethos of decentralisation.",
      jobTitle: "Legal Researcher",
      company: "DAO Legal Lab",
      location: "Singapore",
      skills: ["Research", "Strategy", "Leadership"],
      interests: ["Legal Frameworks", "DAOs", "Regulation"],
    },
  ];

  console.log("👤 Creating demo users with profiles...");
  const userMap = new Map<string, string>(); // email -> userId

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, surname: u.surname },
      create: {
        email: u.email,
        firstName: u.firstName,
        surname: u.surname,
      },
    });
    userMap.set(u.email, user.id);

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: u.bio,
        jobTitle: u.jobTitle,
        company: u.company,
        location: u.location,
        skills: u.skills,
        interests: u.interests,
        isPublic: true,
      },
      create: {
        userId: user.id,
        bio: u.bio,
        jobTitle: u.jobTitle,
        company: u.company,
        location: u.location,
        skills: u.skills,
        interests: u.interests,
        isPublic: true,
      },
    });
    console.log(
      `  ✅ ${u.firstName} ${u.surname} — ${u.jobTitle}, ${u.company}`,
    );
  }

  // ── 3. Assign roles for the example event ───────────────────────
  console.log("\n🎭 Assigning roles...");
  const speakerRole = await prisma.role.findUnique({
    where: { name: "speaker" },
  });
  const organizerRole = await prisma.role.findUnique({
    where: { name: "organizer" },
  });
  const participantRoleForConf = await prisma.role.findUnique({
    where: { name: "participant" },
  });

  // Organizers
  const organizerEmails = [
    "amara.okafor@demo.example",
    "liam.oconnor@demo.example",
  ];
  for (const email of organizerEmails) {
    const userId = userMap.get(email);
    if (userId && organizerRole) {
      await prisma.userRole.upsert({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId: exampleConf.id,
            roleId: organizerRole.id,
          },
        },
        update: {},
        create: { userId, eventId: exampleConf.id, roleId: organizerRole.id },
      });
    }
  }

  // Speakers
  const speakerEmails = [
    "kai.tanaka@demo.example",
    "marcus.chen@demo.example",
    "priya.sharma@demo.example",
    "zara.mbeki@demo.example",
    "ravi.patel@demo.example",
    "maya.johansson@demo.example",
    "luna.park@demo.example",
    "aisha.rahman@demo.example",
  ];
  for (const email of speakerEmails) {
    const userId = userMap.get(email);
    if (userId && speakerRole) {
      await prisma.userRole.upsert({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId: exampleConf.id,
            roleId: speakerRole.id,
          },
        },
        update: {},
        create: { userId, eventId: exampleConf.id, roleId: speakerRole.id },
      });
    }
  }

  // Participants (everyone)
  for (const [_email, userId] of userMap) {
    if (participantRoleForConf) {
      await prisma.userRole.upsert({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId: exampleConf.id,
            roleId: participantRoleForConf.id,
          },
        },
        update: {},
        create: {
          userId,
          eventId: exampleConf.id,
          roleId: participantRoleForConf.id,
        },
      });
    }
  }
  console.log(`  ✅ Assigned roles for ${userMap.size} users`);

  // ── 4. Schedule data ────────────────────────────────────────────
  console.log("\n📅 Creating schedule data...");

  // Venues
  const confVenues = [
    { name: "Main Stage", order: 1, capacity: 500 },
    { name: "Workshop Room A", order: 2, capacity: 60 },
    { name: "Workshop Room B", order: 3, capacity: 40 },
    { name: "Breakout Space", order: 4, capacity: 30 },
    { name: "Terrace", order: 5, capacity: 80 },
  ];

  const venueIdMap = new Map<string, string>();
  for (const v of confVenues) {
    const venue = await prisma.scheduleVenue.upsert({
      where: { eventId_name: { eventId: exampleConf.id, name: v.name } },
      update: { order: v.order, capacity: v.capacity },
      create: {
        eventId: exampleConf.id,
        name: v.name,
        order: v.order,
        capacity: v.capacity,
      },
    });
    venueIdMap.set(v.name, venue.id);
    console.log(`  ✅ Venue: ${v.name}`);
  }

  // Rooms (for Workshop Room A)
  const workshopARooms = [
    { name: "Room A-1", order: 1 },
    { name: "Room A-2", order: 2 },
  ];
  const workshopAId = venueIdMap.get("Workshop Room A")!;
  for (const r of workshopARooms) {
    await prisma.scheduleRoom.upsert({
      where: { venueId_name: { venueId: workshopAId, name: r.name } },
      update: { order: r.order },
      create: { venueId: workshopAId, name: r.name, order: r.order },
    });
  }

  // Session Types
  const confSessionTypes = [
    { name: "Keynote", color: "#e06060", order: 1 },
    { name: "Panel", color: "#93b5f5", order: 2 },
    { name: "Workshop", color: "#86d861", order: 3 },
    { name: "Lightning Talk", color: "#c084fc", order: 4 },
    { name: "Fireside Chat", color: "#e8a838", order: 5 },
    { name: "Break", color: "#94a3b8", order: 6 },
  ];

  const sessionTypeIdMap = new Map<string, string>();
  for (const st of confSessionTypes) {
    const sessionType = await prisma.scheduleSessionType.upsert({
      where: { eventId_name: { eventId: exampleConf.id, name: st.name } },
      update: { color: st.color, order: st.order },
      create: {
        eventId: exampleConf.id,
        name: st.name,
        color: st.color,
        order: st.order,
      },
    });
    sessionTypeIdMap.set(st.name, sessionType.id);
  }

  // Tracks
  const confTracks = [
    { name: "AI & Governance", color: "#8b5cf6", order: 1 },
    { name: "Public Goods Funding", color: "#3b82f6", order: 2 },
    { name: "Infrastructure & Privacy", color: "#10b981", order: 3 },
    { name: "Community & Impact", color: "#f97316", order: 4 },
  ];

  const trackIdMap = new Map<string, string>();
  for (const tr of confTracks) {
    const track = await prisma.scheduleTrack.upsert({
      where: { eventId_name: { eventId: exampleConf.id, name: tr.name } },
      update: { color: tr.color, order: tr.order },
      create: {
        eventId: exampleConf.id,
        name: tr.name,
        color: tr.color,
        order: tr.order,
      },
    });
    trackIdMap.set(tr.name, track.id);
  }
  console.log("  ✅ Session types and tracks created");

  // Venue Owners (floor leads)
  const venueOwnerAssignments = [
    { email: "amara.okafor@demo.example", venue: "Main Stage" },
    { email: "liam.oconnor@demo.example", venue: "Workshop Room A" },
    { email: "sofia.andersen@demo.example", venue: "Workshop Room B" },
    { email: "elena.vasquez@demo.example", venue: "Terrace" },
  ];

  for (const vo of venueOwnerAssignments) {
    const userId = userMap.get(vo.email);
    const venueId = venueIdMap.get(vo.venue);
    if (userId && venueId) {
      await prisma.venueOwner.upsert({
        where: { userId_venueId: { userId, venueId } },
        update: {},
        create: { userId, venueId, eventId: exampleConf.id },
      });
    }
  }
  console.log("  ✅ Venue owners assigned");

  // Sessions — Day 1 (March 14) and Day 2 (March 15)
  const CD1 = "2026-03-14";
  const CD2 = "2026-03-15";

  function cd1(hour: number, min: number): Date {
    return new Date(
      `${CD1}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00Z`,
    );
  }
  function cd2(hour: number, min: number): Date {
    return new Date(
      `${CD2}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00Z`,
    );
  }

  interface ConfSessionDef {
    title: string;
    description: string | null;
    start: Date;
    end: Date;
    venue: string;
    type: string;
    track: string | null;
    speakers: Array<{ email: string; role?: string }>;
  }

  const confSessions: ConfSessionDef[] = [
    // ── DAY 1 ──
    {
      title: "Opening Keynote: Building the Commons in the Age of AI",
      description:
        "Setting the stage for two days of collaboration. How do we fund, build, and govern shared infrastructure when artificial intelligence is reshaping every layer of the stack?",
      start: cd1(9, 0),
      end: cd1(9, 45),
      venue: "Main Stage",
      type: "Keynote",
      track: "AI & Governance",
      speakers: [{ email: "ravi.patel@demo.example" }],
    },
    {
      title: "Quadratic Funding 2.0: What We Learned and Where We Go Next",
      description:
        "A deep dive into the evolution of quadratic funding mechanisms, covering collusion resistance, capital efficiency, and real-world deployment results from the past year.",
      start: cd1(10, 0),
      end: cd1(10, 45),
      venue: "Main Stage",
      type: "Panel",
      track: "Public Goods Funding",
      speakers: [
        { email: "kai.tanaka@demo.example", role: "Moderator" },
        { email: "priya.sharma@demo.example", role: "Panelist" },
        { email: "noah.kim@demo.example", role: "Panelist" },
      ],
    },
    {
      title: "Zero-Knowledge Proofs for Identity: A Practical Workshop",
      description:
        "Hands-on workshop building a simple ZK identity verification system. Participants will implement a proof-of-membership circuit without revealing personal data.",
      start: cd1(10, 0),
      end: cd1(11, 30),
      venue: "Workshop Room A",
      type: "Workshop",
      track: "Infrastructure & Privacy",
      speakers: [{ email: "zara.mbeki@demo.example", role: "Facilitator" }],
    },
    {
      title: "Designing for Trust: UX Patterns in Decentralised Apps",
      description:
        "How do you build user trust when there is no central authority? Practical design patterns for wallets, governance interfaces, and token-gated experiences.",
      start: cd1(10, 0),
      end: cd1(11, 0),
      venue: "Workshop Room B",
      type: "Workshop",
      track: "Community & Impact",
      speakers: [{ email: "elena.vasquez@demo.example", role: "Facilitator" }],
    },
    {
      title: "Morning Break",
      description: null,
      start: cd1(11, 0),
      end: cd1(11, 30),
      venue: "Terrace",
      type: "Break",
      track: null,
      speakers: [],
    },
    {
      title: "On-Chain Impact Measurement: From Theory to Dashboards",
      description:
        "How do you measure what matters? This talk presents frameworks for on-chain impact measurement with live demos of dashboards tracking funding flows, developer activity, and community engagement.",
      start: cd1(11, 30),
      end: cd1(12, 0),
      venue: "Main Stage",
      type: "Lightning Talk",
      track: "Community & Impact",
      speakers: [{ email: "noah.kim@demo.example" }],
    },
    {
      title: "Smart Contract Security: The Audit That Saved $50M",
      description:
        "A case study walkthrough of a critical vulnerability discovered during a routine audit. Marcus shares the detective work, the fix, and what it teaches us about building more resilient protocols.",
      start: cd1(11, 30),
      end: cd1(12, 0),
      venue: "Breakout Space",
      type: "Lightning Talk",
      track: "Infrastructure & Privacy",
      speakers: [{ email: "marcus.chen@demo.example" }],
    },
    {
      title: "Cross-Chain Attestations: Building Portable Impact Proofs",
      description:
        "How attestations can create verifiable records of contribution that travel across chains. Maya demonstrates a working prototype for cross-chain impact certificates.",
      start: cd1(12, 0),
      end: cd1(12, 30),
      venue: "Main Stage",
      type: "Lightning Talk",
      track: "Infrastructure & Privacy",
      speakers: [{ email: "maya.johansson@demo.example" }],
    },
    {
      title: "Lunch",
      description: null,
      start: cd1(12, 30),
      end: cd1(14, 0),
      venue: "Terrace",
      type: "Break",
      track: null,
      speakers: [],
    },
    {
      title:
        "DAO Legal Wrappers: Navigating Regulation Without Losing Your Soul",
      description:
        "A fireside chat about the practical realities of giving DAOs legal standing. Luna shares lessons from wrapping three different DAOs across multiple jurisdictions.",
      start: cd1(14, 0),
      end: cd1(14, 45),
      venue: "Main Stage",
      type: "Fireside Chat",
      track: "AI & Governance",
      speakers: [
        { email: "luna.park@demo.example" },
        { email: "liam.oconnor@demo.example" },
      ],
    },
    {
      title: "Building Developer Tooling That People Actually Use",
      description:
        "A practical workshop on developer experience. Diego walks through the process of building, testing, and iterating on open-source developer tools with real user feedback.",
      start: cd1(14, 0),
      end: cd1(15, 30),
      venue: "Workshop Room A",
      type: "Workshop",
      track: "Infrastructure & Privacy",
      speakers: [{ email: "diego.morales@demo.example", role: "Facilitator" }],
    },
    {
      title: "Climate Data on Chain: MRV Infrastructure for Carbon Markets",
      description:
        "How blockchain can bring transparency and integrity to carbon credit markets. Priya presents VeridiChain architecture and lessons from deploying MRV systems in three countries.",
      start: cd1(14, 0),
      end: cd1(14, 30),
      venue: "Breakout Space",
      type: "Lightning Talk",
      track: "Community & Impact",
      speakers: [{ email: "priya.sharma@demo.example" }],
    },
    {
      title: "Afternoon Break",
      description: null,
      start: cd1(15, 30),
      end: cd1(16, 0),
      venue: "Terrace",
      type: "Break",
      track: null,
      speakers: [],
    },
    {
      title: "Storytelling the Commons: How Narrative Shapes Public Goods",
      description:
        "Why do some public goods projects capture hearts and wallets while others languish? Aisha explores the role of storytelling in funding decisions and community building.",
      start: cd1(16, 0),
      end: cd1(16, 30),
      venue: "Main Stage",
      type: "Lightning Talk",
      track: "Community & Impact",
      speakers: [{ email: "aisha.rahman@demo.example" }],
    },
    {
      title: "Day 1 Closing Panel: What Does Success Look Like?",
      description:
        "Reflections on the day and a forward-looking conversation about what success means for the public goods ecosystem over the next five years.",
      start: cd1(16, 30),
      end: cd1(17, 30),
      venue: "Main Stage",
      type: "Panel",
      track: null,
      speakers: [
        { email: "amara.okafor@demo.example", role: "Moderator" },
        { email: "ravi.patel@demo.example", role: "Panelist" },
        { email: "priya.sharma@demo.example", role: "Panelist" },
        { email: "liam.oconnor@demo.example", role: "Panelist" },
      ],
    },

    // ── DAY 2 ──
    {
      title: "Day 2 Opening: Community Reflections",
      description:
        "Brief opening to day two with reflections from yesterday and a preview of today.",
      start: cd2(9, 0),
      end: cd2(9, 30),
      venue: "Main Stage",
      type: "Keynote",
      track: null,
      speakers: [{ email: "amara.okafor@demo.example" }],
    },
    {
      title: "Node Infrastructure as a Public Good",
      description:
        "Running reliable node infrastructure is essential but undervalued. Felix makes the case for treating infrastructure operators as public goods providers and explores sustainable funding models.",
      start: cd2(9, 30),
      end: cd2(10, 0),
      venue: "Main Stage",
      type: "Lightning Talk",
      track: "Infrastructure & Privacy",
      speakers: [{ email: "felix.braun@demo.example" }],
    },
    {
      title: "Governance Design Sprint",
      description:
        "A hands-on workshop where teams design governance systems for hypothetical DAOs. Each team presents their design and receives feedback from governance practitioners.",
      start: cd2(9, 30),
      end: cd2(11, 0),
      venue: "Workshop Room A",
      type: "Workshop",
      track: "AI & Governance",
      speakers: [{ email: "liam.oconnor@demo.example", role: "Facilitator" }],
    },
    {
      title: "Impact Metrics Workshop: Building Your Project Dashboard",
      description:
        "A practical session where participants set up impact tracking for their own projects using open-source tools. Leave with a working metrics dashboard.",
      start: cd2(9, 30),
      end: cd2(11, 0),
      venue: "Workshop Room B",
      type: "Workshop",
      track: "Community & Impact",
      speakers: [
        { email: "noah.kim@demo.example", role: "Facilitator" },
        { email: "sofia.andersen@demo.example", role: "Facilitator" },
      ],
    },
    {
      title: "Morning Break",
      description: null,
      start: cd2(11, 0),
      end: cd2(11, 30),
      venue: "Terrace",
      type: "Break",
      track: null,
      speakers: [],
    },
    {
      title: "The Future of Retroactive Public Goods Funding",
      description:
        "A panel examining retroPGF experiments across ecosystems. What worked, what did not, and how mechanism designers are iterating on the core idea.",
      start: cd2(11, 30),
      end: cd2(12, 30),
      venue: "Main Stage",
      type: "Panel",
      track: "Public Goods Funding",
      speakers: [
        { email: "kai.tanaka@demo.example", role: "Moderator" },
        { email: "maya.johansson@demo.example", role: "Panelist" },
        { email: "ravi.patel@demo.example", role: "Panelist" },
        { email: "amara.okafor@demo.example", role: "Panelist" },
      ],
    },
    {
      title: "Lunch",
      description: null,
      start: cd2(12, 30),
      end: cd2(14, 0),
      venue: "Terrace",
      type: "Break",
      track: null,
      speakers: [],
    },
    {
      title: "From Hackathon to Product: Shipping Public Goods Software",
      description:
        "A fireside chat about the journey from hackathon prototype to production software. Diego and Maya share war stories and practical advice for builders.",
      start: cd2(14, 0),
      end: cd2(14, 45),
      venue: "Main Stage",
      type: "Fireside Chat",
      track: "Infrastructure & Privacy",
      speakers: [
        { email: "diego.morales@demo.example" },
        { email: "maya.johansson@demo.example" },
      ],
    },
    {
      title: "Privacy-Preserving Analytics for Public Goods",
      description:
        "How do you measure impact without surveilling users? Zara presents approaches to privacy-preserving analytics that give projects the data they need while respecting user rights.",
      start: cd2(14, 0),
      end: cd2(14, 30),
      venue: "Breakout Space",
      type: "Lightning Talk",
      track: "Infrastructure & Privacy",
      speakers: [{ email: "zara.mbeki@demo.example" }],
    },
    {
      title: "Closing Keynote: The Commons We Build Together",
      description:
        "A closing address weaving together the themes of the conference — funding, building, governing, and measuring public goods. An invitation to keep building after we leave San Francisco.",
      start: cd2(15, 0),
      end: cd2(15, 45),
      venue: "Main Stage",
      type: "Keynote",
      track: null,
      speakers: [
        { email: "ravi.patel@demo.example" },
        { email: "priya.sharma@demo.example" },
      ],
    },
    {
      title: "Farewell Reception",
      description: null,
      start: cd2(16, 0),
      end: cd2(18, 0),
      venue: "Terrace",
      type: "Break",
      track: null,
      speakers: [],
    },
  ];

  console.log("📋 Creating sessions...");
  for (const sess of confSessions) {
    const venueId = venueIdMap.get(sess.venue);
    const typeId = sessionTypeIdMap.get(sess.type);
    const trackId = sess.track ? (trackIdMap.get(sess.track) ?? null) : null;

    if (!venueId || !typeId) continue;

    const existing = await prisma.scheduleSession.findFirst({
      where: {
        eventId: exampleConf.id,
        title: sess.title,
        startTime: sess.start,
      },
    });

    let session;
    if (existing) {
      session = await prisma.scheduleSession.update({
        where: { id: existing.id },
        data: {
          description: sess.description,
          endTime: sess.end,
          venueId,
          sessionTypeId: typeId,
          trackId,
          isPublished: true,
        },
      });
    } else {
      session = await prisma.scheduleSession.create({
        data: {
          eventId: exampleConf.id,
          title: sess.title,
          description: sess.description,
          startTime: sess.start,
          endTime: sess.end,
          venueId,
          sessionTypeId: typeId,
          trackId,
          isPublished: true,
        },
      });
    }

    // Clear and re-add speakers
    await prisma.sessionSpeaker.deleteMany({
      where: { sessionId: session.id },
    });
    for (let i = 0; i < sess.speakers.length; i++) {
      const sp = sess.speakers[i]!;
      const userId = userMap.get(sp.email);
      if (userId) {
        await prisma.sessionSpeaker.create({
          data: {
            sessionId: session.id,
            userId,
            role: sp.role ?? "Speaker",
            order: i,
          },
        });
      }
    }
    console.log(`  ✅ ${sess.title}`);
  }

  // ── 5. Speaker applications ─────────────────────────────────────
  console.log("\n🎤 Creating speaker applications...");

  const speakerApps = [
    {
      email: "kai.tanaka@demo.example",
      status: "ACCEPTED" as const,
      talkTitle: "Quadratic Funding 2.0: What We Learned",
      talkAbstract:
        "A deep dive into the evolution of quadratic funding mechanisms and real-world deployment results.",
      talkFormat: "Talk / Presentation",
      talkDuration: "45",
      talkTopic: "AI Governance and Coordination",
    },
    {
      email: "marcus.chen@demo.example",
      status: "ACCEPTED" as const,
      talkTitle: "Smart Contract Security: The Audit That Saved $50M",
      talkAbstract:
        "A case study of a critical vulnerability and the lessons it teaches about building resilient protocols.",
      talkFormat: "Talk / Presentation",
      talkDuration: "30",
      talkTopic: "Open Infrastructure for Collective Intelligence",
    },
    {
      email: "priya.sharma@demo.example",
      status: "ACCEPTED" as const,
      talkTitle: "Climate Data on Chain: MRV Infrastructure",
      talkAbstract:
        "How blockchain brings transparency to carbon markets with live demos of MRV systems deployed across three countries.",
      talkFormat: "Talk / Presentation",
      talkDuration: "30",
      talkTopic: "Applied Human-AI Collaboration",
    },
    {
      email: "zara.mbeki@demo.example",
      status: "ACCEPTED" as const,
      talkTitle: "Zero-Knowledge Proofs for Identity",
      talkAbstract:
        "Hands-on workshop building a ZK identity verification system without revealing personal data.",
      talkFormat: "Workshop",
      talkDuration: "90",
      talkTopic: "Open Infrastructure for Collective Intelligence",
    },
    {
      email: "maya.johansson@demo.example",
      status: "ACCEPTED" as const,
      talkTitle: "Cross-Chain Attestations: Building Portable Impact Proofs",
      talkAbstract:
        "How attestations create verifiable records of contribution that travel across chains.",
      talkFormat: "Demonstration",
      talkDuration: "30",
      talkTopic: "Open Infrastructure for Collective Intelligence",
    },
    {
      email: "aisha.rahman@demo.example",
      status: "ACCEPTED" as const,
      talkTitle: "Storytelling the Commons",
      talkAbstract:
        "Why narrative shapes funding decisions and how projects can better communicate their impact story.",
      talkFormat: "Talk / Presentation",
      talkDuration: "30",
      talkTopic: "Applied Human-AI Collaboration",
    },
    {
      email: "luna.park@demo.example",
      status: "SUBMITTED" as const,
      talkTitle: "DAO Legal Wrappers: A Practitioner Guide",
      talkAbstract:
        "Lessons from wrapping three DAOs across multiple jurisdictions while preserving decentralisation.",
      talkFormat: "Panel Discussion",
      talkDuration: "45",
      talkTopic: "AI Governance and Coordination",
    },
    {
      email: "felix.braun@demo.example",
      status: "UNDER_REVIEW" as const,
      talkTitle: "Node Infrastructure as a Public Good",
      talkAbstract:
        "The case for treating infrastructure operators as public goods providers and sustainable funding models.",
      talkFormat: "Talk / Presentation",
      talkDuration: "30",
      talkTopic: "Open Infrastructure for Collective Intelligence",
    },
  ];

  for (const app of speakerApps) {
    const userId = userMap.get(app.email);
    if (!userId) continue;

    await prisma.application.upsert({
      where: { userId_eventId: { userId, eventId: exampleConf.id } },
      update: { status: app.status, applicationType: "SPEAKER" },
      create: {
        userId,
        eventId: exampleConf.id,
        email: app.email,
        status: app.status,
        applicationType: "SPEAKER",
        submittedAt: new Date(),
      },
    });

    // Update speaker profile fields
    await prisma.userProfile.update({
      where: { userId },
      data: {
        speakerTalkTitle: app.talkTitle,
        speakerTalkAbstract: app.talkAbstract,
        speakerTalkFormat: app.talkFormat,
        speakerTalkDuration: app.talkDuration,
        speakerTalkTopic: app.talkTopic,
      },
    });
    console.log(`  ✅ Speaker app: ${app.email} (${app.status})`);
  }

  // ── 6. Projects with updates ────────────────────────────────────
  console.log("\n🚀 Creating projects with updates...");

  const projectsData = [
    {
      ownerEmail: "amara.okafor@demo.example",
      title: "GovGraph",
      description:
        "A visual explorer for DAO governance decisions. GovGraph aggregates proposal data across protocols and renders interactive decision trees so communities can understand how their governance actually works.",
      technologies: ["TypeScript", "React", "GraphQL", "D3.js"],
      focusAreas: ["Governance", "Data Visualization", "DAOs"],
      repoUrl: "https://github.com/demo-org/govgraph",
      repoName: "govgraph",
      updates: [
        {
          title: "Project kickoff and data model design",
          content:
            "Started by mapping the governance data landscape. We identified 12 major protocols with accessible on-chain proposal data and designed a unified schema that can represent proposals, votes, and execution across all of them.\n\nKey decisions:\n- Using The Graph for indexing\n- D3.js force-directed graphs for visualization\n- PostgreSQL for caching aggregated data",
          tags: ["milestone"],
          weekNumber: 1,
        },
        {
          title: "First working prototype",
          content:
            "The core visualization is working! Users can now explore governance decisions as interactive trees. Each node represents a proposal with color-coded status (passed, failed, pending). Clicking a node shows vote breakdowns and delegate participation.\n\nNext up: adding cross-protocol comparison views.",
          tags: ["demo", "milestone"],
          weekNumber: 2,
        },
      ],
    },
    {
      ownerEmail: "priya.sharma@demo.example",
      title: "VeridiChain MRV",
      description:
        "On-chain measurement, reporting, and verification infrastructure for carbon credit markets. Making climate data transparent, auditable, and resistant to double-counting.",
      technologies: ["Solidity", "Python", "Next.js", "PostgreSQL"],
      focusAreas: ["Climate", "Carbon Markets", "Impact Measurement"],
      repoUrl: "https://github.com/demo-org/veridichain-mrv",
      repoName: "veridichain-mrv",
      updates: [
        {
          title: "Smart contract architecture finalized",
          content:
            "Completed the core smart contract design for the MRV registry. Each carbon credit gets a unique on-chain identity with linked measurement data, verification attestations, and retirement tracking.\n\nThe contract has been reviewed by two independent auditors and we are confident in the security model.",
          tags: ["milestone"],
          weekNumber: 1,
        },
        {
          title: "Sensor data pipeline live",
          content:
            "The off-chain data pipeline is now operational. IoT sensors from three pilot sites in Kenya are streaming temperature, humidity, and soil carbon measurements to our oracle network.\n\nData flows: Sensor -> MQTT -> Oracle Node -> On-chain attestation\n\nLatency is under 15 minutes from measurement to on-chain record.",
          tags: ["milestone", "demo"],
          weekNumber: 2,
        },
        {
          title: "Dashboard and API launch",
          content:
            "Launched the public dashboard at veridichain.demo — anyone can now explore carbon credit lifecycle data, verify measurement provenance, and track retirement status in real time.\n\nAlso shipped a REST API for third-party integrations. Documentation is live.",
          tags: ["demo", "milestone"],
          weekNumber: 3,
        },
      ],
    },
    {
      ownerEmail: "maya.johansson@demo.example",
      title: "AttestBridge",
      description:
        "Cross-chain attestation protocol enabling impact proofs to travel between Ethereum, Optimism, and Arbitrum. Built on EAS with custom resolver contracts.",
      technologies: ["Solidity", "TypeScript", "Ethers.js", "Hardhat"],
      focusAreas: ["Attestations", "Cross-chain", "Infrastructure"],
      repoUrl: "https://github.com/demo-org/attestbridge",
      repoName: "attestbridge",
      updates: [
        {
          title: "Bridge contract deployed on testnet",
          content:
            "The core bridge contract is live on Optimism Sepolia and Arbitrum Sepolia. Successfully tested end-to-end attestation bridging — an attestation created on OP can now be verified on Arbitrum within 2 blocks.\n\nGas costs are reasonable: ~0.002 ETH per bridge operation.",
          tags: ["milestone", "demo"],
          weekNumber: 1,
        },
        {
          title: "SDK v0.1 released",
          content:
            "Published the first version of the AttestBridge SDK on npm. Developers can now bridge attestations with three lines of code:\n\n```typescript\nconst bridge = new AttestBridge(provider);\nconst receipt = await bridge.bridge(attestationUID, targetChain);\nconsole.log(receipt.bridgedUID);\n```\n\nFull documentation and examples included.",
          tags: ["demo"],
          weekNumber: 2,
        },
      ],
    },
    {
      ownerEmail: "diego.morales@demo.example",
      title: "Web3UI Kit",
      description:
        "A comprehensive React component library for Web3 applications. Wallet connection, token displays, governance interfaces, and transaction builders — all with built-in accessibility and dark mode.",
      technologies: ["React", "TypeScript", "Tailwind CSS", "Storybook"],
      focusAreas: ["Developer Tooling", "Open Source", "Frontend"],
      repoUrl: "https://github.com/demo-org/web3ui-kit",
      repoName: "web3ui-kit",
      updates: [
        {
          title: "Component library architecture",
          content:
            "Designed the component architecture with a focus on composability and accessibility. Every component will meet WCAG 2.1 AA standards out of the box.\n\nThe library uses a headless approach — logic is separated from styling so developers can use any CSS framework.\n\nStarted with the most-requested components: WalletConnect, TokenBalance, TransactionBuilder.",
          tags: ["milestone"],
          weekNumber: 1,
        },
        {
          title: "Storybook playground live",
          content:
            "Launched the interactive Storybook documentation with live examples for all 18 components shipped so far. Each component has:\n- Interactive props playground\n- Accessibility audit results\n- Code snippets in TypeScript and JavaScript\n- Dark mode preview toggle\n\nAlready getting feedback from the community — 47 GitHub stars in the first week.",
          tags: ["demo", "milestone"],
          weekNumber: 2,
        },
      ],
    },
    {
      ownerEmail: "noah.kim@demo.example",
      title: "ImpactLens",
      description:
        "An open-source dashboard framework for visualising public goods impact metrics. Connects to on-chain data, GitHub activity, and self-reported milestones to create holistic project health views.",
      technologies: ["Python", "Next.js", "PostgreSQL", "D3.js"],
      focusAreas: ["Impact Measurement", "Data Visualization", "Public Goods"],
      repoUrl: "https://github.com/demo-org/impactlens",
      repoName: "impactlens",
      updates: [
        {
          title: "Data connectors for 5 chains",
          content:
            "Built data connectors for Ethereum, Optimism, Arbitrum, Base, and Polygon. Each connector indexes funding events, attestations, and token transfers relevant to public goods projects.\n\nThe unified data model allows cross-chain comparison — you can now see a project total funding regardless of which chain it received funds on.",
          tags: ["milestone"],
          weekNumber: 1,
        },
      ],
    },
  ];

  for (const proj of projectsData) {
    const userId = userMap.get(proj.ownerEmail);
    if (!userId) continue;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) continue;

    const project = await prisma.userProject.upsert({
      where: { id: `demo-project-${proj.repoName}` },
      update: {
        title: proj.title,
        description: proj.description,
        technologies: proj.technologies,
        focusAreas: proj.focusAreas,
      },
      create: {
        id: `demo-project-${proj.repoName}`,
        profileId: profile.id,
        title: proj.title,
        description: proj.description,
        technologies: proj.technologies,
        focusAreas: proj.focusAreas,
        featured: true,
      },
    });

    // Repository
    await prisma.repository.upsert({
      where: { id: `demo-repo-${proj.repoName}` },
      update: { url: proj.repoUrl, name: proj.repoName, isPrimary: true },
      create: {
        id: `demo-repo-${proj.repoName}`,
        projectId: project.id,
        url: proj.repoUrl,
        name: proj.repoName,
        isPrimary: true,
        totalCommits: Math.floor(Math.random() * 200) + 50,
        isActive: true,
      },
    });

    // Updates
    for (const update of proj.updates) {
      const existing = await prisma.projectUpdate.findFirst({
        where: { projectId: project.id, title: update.title },
      });
      if (!existing) {
        const pu = await prisma.projectUpdate.create({
          data: {
            projectId: project.id,
            userId,
            title: update.title,
            content: update.content,
            tags: update.tags,
            weekNumber: update.weekNumber,
          },
        });

        // Add a few likes on updates from other users
        const likerEmails = demoUsers
          .filter((u) => u.email !== proj.ownerEmail)
          .slice(0, 3);
        for (const liker of likerEmails) {
          const likerId = userMap.get(liker.email);
          if (likerId) {
            await prisma.projectUpdateLike.upsert({
              where: {
                projectUpdateId_userId: {
                  projectUpdateId: pu.id,
                  userId: likerId,
                },
              },
              update: {},
              create: {
                projectUpdateId: pu.id,
                userId: likerId,
                kudosTransferred: 2.6,
                likerKudosAtTime: 130,
              },
            });
          }
        }
      }
    }

    // Add a comment on the first update
    const firstUpdate = await prisma.projectUpdate.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
    });
    if (firstUpdate) {
      const commenterEmail = demoUsers.find(
        (u) => u.email !== proj.ownerEmail,
      )?.email;
      const commenterId = commenterEmail
        ? userMap.get(commenterEmail)
        : undefined;
      if (commenterId) {
        const existingComment = await prisma.projectUpdateComment.findFirst({
          where: { projectUpdateId: firstUpdate.id, userId: commenterId },
        });
        if (!existingComment) {
          await prisma.projectUpdateComment.create({
            data: {
              projectUpdateId: firstUpdate.id,
              userId: commenterId,
              content:
                "Great progress! Looking forward to seeing this evolve. Let me know if you need any help with the architecture.",
            },
          });
        }
      }
    }

    console.log(`  ✅ Project: ${proj.title} (${proj.updates.length} updates)`);
  }

  // ── 7. Asks & Offers ────────────────────────────────────────────
  console.log("\n🤝 Creating asks & offers...");

  const asksOffersData = [
    {
      email: "amara.okafor@demo.example",
      type: "ASK" as const,
      title: "Looking for a Solidity auditor",
      description:
        "GovGraph needs a security review of our governance data indexing contracts before mainnet deployment. Looking for someone with experience auditing read-heavy contracts.",
      tags: ["security", "solidity", "audit"],
    },
    {
      email: "elena.vasquez@demo.example",
      type: "OFFER" as const,
      title: "Free UX review for public goods projects",
      description:
        "I have capacity to do detailed UX reviews for 2-3 projects this month. I will provide a written report with specific recommendations, wireframes for key improvements, and a 30-minute feedback call.",
      tags: ["design", "ux", "mentorship"],
    },
    {
      email: "marcus.chen@demo.example",
      type: "OFFER" as const,
      title: "Smart contract security office hours",
      description:
        "Offering weekly 1-hour office hours for anyone who wants feedback on their smart contract security. Bring your code, I will bring the red pen. No contracts too small.",
      tags: ["security", "mentorship", "solidity"],
    },
    {
      email: "kai.tanaka@demo.example",
      type: "ASK" as const,
      title: "Dataset of QF round results",
      description:
        "For our research on quadratic funding effectiveness, we need historical round data from Gitcoin, CLR.fund, and other QF implementations. Looking for anyone who has cleaned datasets or API access.",
      tags: ["research", "data", "funding"],
    },
    {
      email: "priya.sharma@demo.example",
      type: "ASK" as const,
      title: "Introductions to carbon credit registries",
      description:
        "VeridiChain is looking to partner with established carbon credit registries for our on-chain MRV pilot. Would love introductions to anyone at Verra, Gold Standard, or regional registries.",
      tags: ["partnership", "climate", "introductions"],
    },
    {
      email: "diego.morales@demo.example",
      type: "OFFER" as const,
      title: "Frontend pair programming sessions",
      description:
        "Happy to pair program on React/TypeScript challenges. I have availability for 2-3 sessions per week. Especially useful if you are building with Next.js or need help with Web3 wallet integrations.",
      tags: ["technical", "mentorship", "frontend"],
    },
    {
      email: "felix.braun@demo.example",
      type: "OFFER" as const,
      title: "Infrastructure setup for open-source projects",
      description:
        "I can help set up CI/CD pipelines, Docker configurations, and monitoring for your open-source project. Takes about 2-3 hours per project — free for public goods builders.",
      tags: ["infrastructure", "devops", "mentorship"],
    },
    {
      email: "noah.kim@demo.example",
      type: "ASK" as const,
      title: "Beta testers for ImpactLens dashboard",
      description:
        "ImpactLens is ready for beta testing. Looking for 5-10 project leads who want to set up impact tracking dashboards and give feedback on the UX and data accuracy.",
      tags: ["testing", "feedback", "impact"],
    },
    {
      email: "sofia.andersen@demo.example",
      type: "OFFER" as const,
      title: "Product strategy consultation",
      description:
        "Offering free 45-minute product strategy calls for public goods projects. I can help with roadmap prioritisation, user research planning, and go-to-market strategy for open-source tools.",
      tags: ["strategy", "product", "mentorship"],
    },
    {
      email: "luna.park@demo.example",
      type: "OFFER" as const,
      title: "DAO legal structure guidance",
      description:
        "If your project needs a legal wrapper, I can provide a free initial consultation covering jurisdiction selection, entity types, and regulatory considerations. Based on experience wrapping three DAOs.",
      tags: ["legal", "dao", "mentorship"],
    },
  ];

  for (const ao of asksOffersData) {
    const userId = userMap.get(ao.email);
    if (!userId) continue;

    const existing = await prisma.askOffer.findFirst({
      where: { userId, eventId: exampleConf.id, title: ao.title },
    });

    if (!existing) {
      const created = await prisma.askOffer.create({
        data: {
          userId,
          eventId: exampleConf.id,
          type: ao.type,
          title: ao.title,
          description: ao.description,
          tags: ao.tags,
        },
      });

      // Add likes from 1-4 random users
      const likers = demoUsers
        .filter((u) => u.email !== ao.email)
        .slice(0, Math.floor(Math.random() * 4) + 1);
      for (const liker of likers) {
        const likerId = userMap.get(liker.email);
        if (likerId) {
          await prisma.askOfferLike.create({
            data: {
              askOfferId: created.id,
              userId: likerId,
              kudosTransferred: 2.6,
              likerKudosAtTime: 130,
            },
          });
        }
      }

      // Add a comment on some
      if (Math.random() > 0.4) {
        const commenterEmail = demoUsers.find(
          (u) => u.email !== ao.email,
        )?.email;
        const commenterId = commenterEmail
          ? userMap.get(commenterEmail)
          : undefined;
        if (commenterId) {
          await prisma.askOfferComment.create({
            data: {
              askOfferId: created.id,
              userId: commenterId,
              content:
                ao.type === "ASK"
                  ? "I might be able to help with this — let us connect after the next session!"
                  : "This is exactly what our project needs. Sending you a DM!",
            },
          });
        }
      }
    }
    console.log(`  ✅ ${ao.type}: ${ao.title}`);
  }

  // ── 8. Praise & Kudos ──────────────────────────────────────────
  console.log("\n🙏 Creating praise messages and adjusting kudos...");

  const praiseMessages = [
    {
      senderEmail: "amara.okafor@demo.example",
      recipientEmail: "elena.vasquez@demo.example",
      message:
        "Elena did an incredible UX review of GovGraph — her feedback completely changed how we think about governance data visualization. The wireframes she provided were production-ready.",
      category: "mentorship",
    },
    {
      senderEmail: "kai.tanaka@demo.example",
      recipientEmail: "noah.kim@demo.example",
      message:
        "Noah helped me think through the metrics framework for our QF research. His data visualization skills are world-class and he is always generous with his time.",
      category: "help",
    },
    {
      senderEmail: "marcus.chen@demo.example",
      recipientEmail: "maya.johansson@demo.example",
      message:
        "Maya caught a subtle re-entrancy pattern in our cross-chain bridge that could have been catastrophic. Her attention to detail during code review is unmatched.",
      category: "help",
    },
    {
      senderEmail: "priya.sharma@demo.example",
      recipientEmail: "ravi.patel@demo.example",
      message:
        "Ravi connected VeridiChain with three government agencies interested in on-chain MRV. His network in the policy space is invaluable for climate tech builders.",
      category: "help",
    },
    {
      senderEmail: "elena.vasquez@demo.example",
      recipientEmail: "diego.morales@demo.example",
      message:
        "Diego pair-programmed with me on a tricky wallet connection flow. He turned a frustrating 3-day problem into a 2-hour fix. The Web3UI Kit components are a game-changer.",
      category: "help",
    },
    {
      senderEmail: "liam.oconnor@demo.example",
      recipientEmail: "luna.park@demo.example",
      message:
        "Luna guided our DAO through the legal wrapper process with clarity and patience. She made a complex legal landscape feel navigable. Highly recommend her office hours.",
      category: "mentorship",
    },
    {
      senderEmail: "zara.mbeki@demo.example",
      recipientEmail: "felix.braun@demo.example",
      message:
        "Felix set up our entire CI/CD pipeline in an afternoon. The monitoring dashboards he configured have already caught two issues before they hit production. Infrastructure hero!",
      category: "help",
    },
    {
      senderEmail: "sofia.andersen@demo.example",
      recipientEmail: "kai.tanaka@demo.example",
      message:
        "Kai gave a brilliant talk on mechanism design that completely reframed how I think about funding allocation. His ability to make complex math accessible is a rare gift.",
      category: "talk",
    },
    {
      senderEmail: "noah.kim@demo.example",
      recipientEmail: "amara.okafor@demo.example",
      message:
        "Amara organized an impromptu governance design sprint that brought together perspectives from five different projects. Her facilitation skills are exceptional.",
      category: "help",
    },
    {
      senderEmail: "maya.johansson@demo.example",
      recipientEmail: "zara.mbeki@demo.example",
      message:
        "Zara gave the clearest explanation of ZK circuits I have ever heard. Her workshop turned an intimidating topic into something approachable. I left with a working prototype!",
      category: "talk",
    },
    {
      senderEmail: "diego.morales@demo.example",
      recipientEmail: "sofia.andersen@demo.example",
      message:
        "Sofia helped me refine the product strategy for Web3UI Kit. Her product sense is sharp — she identified the exact three features that would drive adoption.",
      category: "mentorship",
    },
    {
      senderEmail: "ravi.patel@demo.example",
      recipientEmail: "priya.sharma@demo.example",
      message:
        "Priya presented VeridiChain to a room full of skeptics and won them all over. Her passion for climate data integrity is contagious and her technical depth is impressive.",
      category: "talk",
    },
  ];

  for (const p of praiseMessages) {
    const senderId = userMap.get(p.senderEmail);
    const recipientId = userMap.get(p.recipientEmail);
    if (!senderId || !recipientId) continue;

    const recipient = demoUsers.find((u) => u.email === p.recipientEmail);
    const recipientName = recipient
      ? `${recipient.firstName} ${recipient.surname}`
      : "Unknown";

    const existing = await prisma.praise.findFirst({
      where: {
        senderId,
        recipientId,
        eventId: exampleConf.id,
        message: p.message,
      },
    });

    if (!existing) {
      await prisma.praise.create({
        data: {
          senderId,
          recipientId,
          recipientName,
          message: p.message,
          category: p.category,
          eventId: exampleConf.id,
          isPublic: true,
          kudosTransferred: 6.5,
          senderKudosAtTime: 130,
        },
      });
    }
  }
  console.log(`  ✅ Created ${praiseMessages.length} praise messages`);

  // Adjust kudos scores for leaderboard variety
  const kudosScores: Record<string, number> = {
    "elena.vasquez@demo.example": 215,
    "kai.tanaka@demo.example": 198,
    "amara.okafor@demo.example": 185,
    "marcus.chen@demo.example": 175,
    "maya.johansson@demo.example": 168,
    "zara.mbeki@demo.example": 162,
    "diego.morales@demo.example": 155,
    "priya.sharma@demo.example": 150,
    "noah.kim@demo.example": 145,
    "felix.braun@demo.example": 140,
    "luna.park@demo.example": 138,
    "ravi.patel@demo.example": 135,
    "sofia.andersen@demo.example": 132,
    "liam.oconnor@demo.example": 128,
    "aisha.rahman@demo.example": 122,
  };

  for (const [email, kudos] of Object.entries(kudosScores)) {
    const userId = userMap.get(email);
    if (userId) {
      await prisma.user.update({ where: { id: userId }, data: { kudos } });
    }
  }
  console.log("  ✅ Adjusted kudos scores for leaderboard variety");

  // ── 9. Forum threads ────────────────────────────────────────────
  console.log("\n💬 Creating forum threads...");

  const forumThreads = [
    {
      authorEmail: "kai.tanaka@demo.example",
      title: "What metrics actually matter for measuring public goods impact?",
      content:
        "I have been thinking a lot about how we evaluate public goods funding effectiveness. Most current approaches focus on easy-to-measure outputs (number of grants, total funding distributed) rather than meaningful outcomes.\n\nSome metrics I think deserve more attention:\n- **Developer retention**: How many funded developers are still active 12 months later?\n- **Dependency depth**: How many other projects depend on funded infrastructure?\n- **Community health**: Are funded communities growing, diversifying, and sustaining themselves?\n\nWhat metrics do you think the ecosystem is missing? And how do we avoid Goodhart's law (once a metric becomes a target, it ceases to be a good metric)?",
      tags: ["impact", "metrics", "research"],
    },
    {
      authorEmail: "liam.oconnor@demo.example",
      title: "Governance fatigue is real — how do we fix voter participation?",
      content:
        "Across every DAO I have worked with, voter participation follows the same depressing curve: high enthusiasm in month 1, steady decline, and eventually a small group of 5-10 people making all decisions.\n\nI think the problem is structural, not motivational. Some ideas:\n1. **Delegation by default** — new members automatically delegate to active participants\n2. **Attention-aware proposals** — batch low-stakes decisions and only surface important ones\n3. **Contribution-weighted voting** — weight votes by actual participation in the project\n\nHas anyone seen governance designs that successfully maintain participation over time?",
      tags: ["governance", "dao", "participation"],
    },
    {
      authorEmail: "priya.sharma@demo.example",
      title:
        "The carbon credit market needs radical transparency — here is how",
      content:
        "After two years building MRV infrastructure, I am convinced that the carbon credit market's biggest problem is not technology — it is information asymmetry.\n\nBuyers cannot verify that credits represent real carbon removal. Registries operate as black boxes. And double-counting happens more often than anyone wants to admit.\n\nBlockchain can fix this, but only if we:\n- Make measurement data publicly verifiable\n- Create on-chain provenance chains from sensor to credit\n- Build open registries that anyone can audit\n\nWho else is working on climate data transparency? Would love to compare approaches.",
      tags: ["climate", "transparency", "carbon"],
    },
    {
      authorEmail: "elena.vasquez@demo.example",
      title: "Why are Web3 apps still so hard to use?",
      content:
        'I just finished UX audits of 15 popular DeFi and governance apps. The results are sobering:\n\n- Average time to complete a basic transaction: **4.2 minutes** (should be under 30 seconds)\n- 73% of apps use jargon that even experienced users find confusing\n- Only 2 out of 15 apps had proper error messages when transactions fail\n\nWe keep saying "onboard the next billion users" but we have not even made the experience acceptable for the current million.\n\nI am compiling a public goods UX playbook. What are the worst UX patterns you have encountered?',
      tags: ["ux", "design", "web3"],
    },
    {
      authorEmail: "marcus.chen@demo.example",
      title:
        "Security audit costs are pricing out small projects — what can we do?",
      content:
        "A full smart contract audit from a reputable firm costs $50K-$200K. Most public goods projects have total budgets under $100K.\n\nThis means the projects that need security review the most — early-stage, under-funded, high-impact — are exactly the ones that cannot afford it.\n\nSome ideas for making security more accessible:\n- **Cooperative audit pools** — projects pool funds for shared auditors\n- **Tiered review process** — automated tools first, human review for flagged issues\n- **Security as a retroactive public good** — fund audits retroactively based on TVL protected\n\nI am starting free office hours for small projects. Who wants to help scale this?",
      tags: ["security", "funding", "public-goods"],
    },
  ];

  for (const thread of forumThreads) {
    const userId = userMap.get(thread.authorEmail);
    if (!userId) continue;

    const existing = await prisma.forumThread.findFirst({
      where: { userId, title: thread.title },
    });

    if (!existing) {
      const ft = await prisma.forumThread.create({
        data: {
          userId,
          title: thread.title,
          content: thread.content,
          tags: thread.tags,
        },
      });

      // Add likes
      const likers = demoUsers
        .filter((u) => u.email !== thread.authorEmail)
        .slice(0, Math.floor(Math.random() * 5) + 2);
      for (const liker of likers) {
        const likerId = userMap.get(liker.email);
        if (likerId) {
          await prisma.forumThreadLike.create({
            data: {
              threadId: ft.id,
              userId: likerId,
              kudosTransferred: 2.6,
              likerKudosAtTime: 130,
            },
          });
        }
      }

      // Add 2-3 comments
      const commenters = demoUsers
        .filter((u) => u.email !== thread.authorEmail)
        .slice(1, 4);
      const commentTexts = [
        "This resonates strongly with what we have been experiencing. I think the key insight is that we need to measure what matters, not just what is easy to measure.",
        "Great points. I have been thinking about a similar approach — would love to chat more about this at the conference.",
        "We tried something like this in our project and learned a lot. Happy to share our experience if helpful.",
      ];
      for (let i = 0; i < commenters.length; i++) {
        const commenterId = userMap.get(commenters[i]!.email);
        if (commenterId) {
          await prisma.forumComment.create({
            data: {
              threadId: ft.id,
              userId: commenterId,
              content: commentTexts[i] ?? commentTexts[0]!,
            },
          });
        }
      }
    }
    console.log(`  ✅ Thread: ${thread.title.substring(0, 50)}...`);
  }

  // ── 10. Sponsors linked to example event ────────────────────────
  console.log("\n💰 Linking sponsors to example event...");

  // Create new sponsors for the example event
  const newSponsors = [
    {
      name: "Filecoin Foundation",
      websiteUrl: "https://fil.org",
      logoUrl: null,
    },
    { name: "Protocol Labs", websiteUrl: "https://protocol.ai", logoUrl: null },
  ];

  for (const s of newSponsors) {
    await prisma.sponsor.upsert({
      where: { name: s.name },
      update: { websiteUrl: s.websiteUrl },
      create: { name: s.name, websiteUrl: s.websiteUrl, logoUrl: s.logoUrl },
    });
  }

  const confSponsorNames = [
    "Gitcoin",
    "Filecoin Foundation",
    "Protocol Labs",
    "Octant",
  ];
  for (const sponsorName of confSponsorNames) {
    const sponsor = await prisma.sponsor.findUnique({
      where: { name: sponsorName },
    });
    if (sponsor) {
      const es = await prisma.eventSponsor.upsert({
        where: {
          eventId_sponsorId: { eventId: exampleConf.id, sponsorId: sponsor.id },
        },
        update: { qualified: true },
        create: {
          eventId: exampleConf.id,
          sponsorId: sponsor.id,
          qualified: true,
        },
      });

      // Add deliverables
      const existingDeliverables = await prisma.sponsorDeliverable.count({
        where: { eventSponsorId: es.id },
      });
      if (existingDeliverables === 0) {
        await prisma.sponsorDeliverable.createMany({
          data: [
            {
              eventSponsorId: es.id,
              category: "TECHNICAL",
              title: `${sponsorName} Technical Workshop`,
              description: `Deep-dive workshop on ${sponsorName} technology and integration patterns`,
              estimatedHours: 4,
              status: "PLANNED",
            },
            {
              eventSponsorId: es.id,
              category: "SUPPORT",
              title: `${sponsorName} Builder Support`,
              description: `Office hours and direct support for builders integrating with ${sponsorName}`,
              estimatedHours: 8,
              status: "IN_PROGRESS",
            },
            {
              eventSponsorId: es.id,
              category: "VISIBILITY",
              title: `${sponsorName} Demo Day Participation`,
              description: `Sponsor booth and demo day judging participation`,
              estimatedHours: 4,
              status: "PLANNED",
            },
          ],
        });
      }
      console.log(`  ✅ Sponsor: ${sponsorName}`);
    }
  }

  // ── 11. Application questions for the conference ─────────────────
  console.log("\n📝 Creating application questions for conference...");

  const confQuestions = [
    {
      questionKey: "full_name",
      questionEn: "Full name",
      questionEs: "Nombre completo",
      questionType: "TEXT" as const,
      required: true,
      order: 1,
    },
    {
      questionKey: "email",
      questionEn: "Email address",
      questionEs: "Correo electrónico",
      questionType: "EMAIL" as const,
      required: true,
      order: 2,
    },
    {
      questionKey: "company",
      questionEn: "Company or organization",
      questionEs: "Empresa u organización",
      questionType: "TEXT" as const,
      required: false,
      order: 3,
    },
    {
      questionKey: "role",
      questionEn: "Your role",
      questionEs: "Tu rol",
      questionType: "TEXT" as const,
      required: false,
      order: 4,
    },
    {
      questionKey: "twitter",
      questionEn: "Twitter / X handle",
      questionEs: "Twitter / X",
      questionType: "TEXT" as const,
      required: false,
      order: 5,
    },
    {
      questionKey: "linkedin",
      questionEn: "LinkedIn URL",
      questionEs: "LinkedIn URL",
      questionType: "URL" as const,
      required: false,
      order: 6,
    },
    {
      questionKey: "why_attend",
      questionEn: "Why do you want to attend this conference?",
      questionEs: "¿Por qué quieres asistir a esta conferencia?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 7,
    },
    {
      questionKey: "what_contribute",
      questionEn: "What can you contribute to the community?",
      questionEs: "¿Qué puedes aportar a la comunidad?",
      questionType: "TEXTAREA" as const,
      required: true,
      order: 8,
    },
    {
      questionKey: "terms_agreement",
      questionEn: "Do you agree to the code of conduct?",
      questionEs: "¿Aceptas el código de conducta?",
      questionType: "SELECT" as const,
      required: true,
      options: ["Yes", "No"],
      order: 9,
    },
  ];

  for (const q of confQuestions) {
    await prisma.applicationQuestion.upsert({
      where: {
        eventId_questionKey: {
          eventId: exampleConf.id,
          questionKey: q.questionKey,
        },
      },
      update: q,
      create: { ...q, eventId: exampleConf.id },
    });
  }
  console.log("  ✅ Application questions created");

  console.log("\n🎉 Example Conference seeding completed successfully!");
  console.log("🎉 Full seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
