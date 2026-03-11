#!/usr/bin/env tsx
/**
 * Example script showing how to create a hypercert for a project
 * This demonstrates the integration between projects and hypercerts on your custom PDS
 */

import { db } from "~/server/db";
import { createHypercertsService } from "~/server/services/hypercerts";

async function createHypercertFromProject() {
  // Example: Create a hypercert for "The Commons - platform" project
  const projectId = "cmhez6tx50001rzf8mcu619np";
  const userId = "your-user-id"; // Replace with actual user ID

  // Get project data (you'd fetch this from your database)
  const project = await db.userProject.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    console.error("❌ Project not found");
    return;
  }

  // Create hypercerts service
  const hypercertsService = createHypercertsService(db);

  try {
    // Create the hypercert
    const result = await hypercertsService.createHypercert(userId, {
      // Required fields
      title: project.title,
      shortDescription:
        project.description ?? "Impact work done during the residency",
      workScope: project.technologies.join(", ") || "Software development",
      workTimeFrameFrom: project.createdAt.toISOString(),
      workTimeFrameTo: new Date().toISOString(),

      // Optional fields
      description: `This hypercert represents the impact work done on ${project.title} during the Funding the Commons residency program.`,

      // Image (project logo or banner)
      image: project.imageUrl ?? project.bannerUrl ?? undefined,

      // Evidence could include:
      // - Links to project updates
      // - GitHub commits
      // - Demo URLs
      // (These would need to be created as separate evidence records first)
      evidence: [],

      // Contributions could link to team members
      contributions: [],
    });

    console.log("✅ Hypercert created successfully!");
    console.log("📍 URI:", result.uri);
    console.log("🔗 CID:", result.cid);
    console.log("\n🌐 View on your PDS:");
    console.log(
      `   curl "https://pds-eu-west4.test.certified.app/xrpc/com.atproto.repo.getRecord?repo=did:plc:63ohi2g5n5xlqgd5z3isdbyx&collection=org.hypercerts.claim&rkey=${result.uri.split("/").pop()}"`,
    );
  } catch (error) {
    console.error("❌ Failed to create hypercert:", error);
  }
}

// Run the example
void createHypercertFromProject();
