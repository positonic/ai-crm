import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSponsorResidency() {
  console.log("🌱 Seeding sponsor residency data...");

  try {
    // Find or create a test event
    let event = await prisma.event.findFirst({
      where: { name: { contains: "realfi" } },
    });

    if (!event) {
      event = await prisma.event.create({
        data: {
          id: "realfi-hackathon-2025",
          name: "RealFi Hackathon 2025 - Builder Residency",
          description: "A 3-week intensive builder residency program",
          startDate: new Date("2025-10-24"),
          endDate: new Date("2025-11-14"),
          location: "San Francisco, CA",
          type: "RESIDENCY",
          isOnline: false,
          createdById: "demo-user-id", // Replace with actual user ID
        },
      });
      console.log("✅ Created demo event:", event.name);
    }

    // Find or create a test sponsor
    let sponsor = await prisma.sponsor.findFirst({
      where: { name: "NEAR Protocol" },
    });

    if (!sponsor) {
      sponsor = await prisma.sponsor.create({
        data: {
          name: "NEAR Protocol",
          websiteUrl: "https://near.org",
          logoUrl:
            "https://near.org/wp-content/themes/near-19/assets/img/brand/logo.svg",
        },
      });
      console.log("✅ Created demo sponsor:", sponsor.name);
    }

    // Create or find EventSponsor relationship
    let eventSponsor = await prisma.eventSponsor.findFirst({
      where: {
        eventId: event.id,
        sponsorId: sponsor.id,
      },
    });

    if (!eventSponsor) {
      eventSponsor = await prisma.eventSponsor.create({
        data: {
          eventId: event.id,
          sponsorId: sponsor.id,
          qualified: true,
        },
      });
      console.log("✅ Created event sponsor relationship");
    }

    // Create default deliverables
    const existingDeliverables = await prisma.sponsorDeliverable.count({
      where: { eventSponsorId: eventSponsor.id },
    });

    if (existingDeliverables === 0) {
      const defaultDeliverables = [
        {
          category: "TECHNICAL" as const,
          title: "NEAR Protocol Deep-dive Workshop",
          description:
            "Host 2-3 technical workshops covering NEAR development, Shade Agents, and privacy-preserving applications",
          estimatedHours: 8,
          status: "PLANNED" as const,
        },
        {
          category: "TECHNICAL" as const,
          title: "Office Hours with NEAR Engineers",
          description:
            "Provide 1-2 office hour sessions for direct mentoring and technical guidance",
          estimatedHours: 4,
          status: "PLANNED" as const,
        },
        {
          category: "SUPPORT" as const,
          title: "Code Templates & Examples",
          description:
            "Provide NEAR code snippets, starter templates, and integration examples for builders",
          estimatedHours: 6,
          status: "IN_PROGRESS" as const,
        },
        {
          category: "PATHWAYS" as const,
          title: "NEAR Ecosystem Integration Session",
          description:
            "Present pathways into Protocol Rewards, Horizon Accelerator, and other NEAR programs",
          estimatedHours: 2,
          status: "PLANNED" as const,
        },
        {
          category: "VISIBILITY" as const,
          title: "Demo Day Judging & Amplification",
          description:
            "Participate in final showcase, provide feedback, and amplify standout projects through NEAR channels",
          estimatedHours: 4,
          status: "PLANNED" as const,
        },
      ];

      await prisma.sponsorDeliverable.createMany({
        data: defaultDeliverables.map((deliverable) => ({
          eventSponsorId: eventSponsor.id,
          ...deliverable,
        })),
      });
      console.log("✅ Created default deliverables");
    }

    // Create a sample visit request
    const existingRequests = await prisma.sponsorVisitRequest.count({
      where: { eventSponsorId: eventSponsor.id },
    });

    if (existingRequests === 0) {
      await prisma.sponsorVisitRequest.create({
        data: {
          eventSponsorId: eventSponsor.id,
          visitType: "KICKOFF",
          preferredDates: [new Date("2025-10-02"), new Date("2025-10-03")],
          numAttendees: 2,
          purpose: "Technical workshop delivery",
          requirements:
            "Need projector and whiteboard for technical deep-dive sessions",
          status: "APPROVED",
          scheduledDate: new Date("2025-10-02"),
        },
      });
      console.log("✅ Created sample visit request");
    }

    console.log("🎉 Sponsor residency seeding complete!");
    console.log(
      `📍 Visit: /sponsors/${sponsor.id}/residency?eventId=${event.id}`,
    );
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedSponsorResidency().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default seedSponsorResidency;
