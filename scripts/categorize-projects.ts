/**
 * Project Categorization Script
 *
 * This script analyzes all projects from a given event and categorizes them
 * into focus areas using AI (Anthropic Claude).
 *
 * Usage:
 *   bun run scripts/categorize-projects.ts <eventId>
 *
 * Example:
 *   bun run scripts/categorize-projects.ts funding-commons-residency-2025
 */

// Load environment variables from .env.local first, then .env
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { db } from "~/server/db";
import Anthropic from "@anthropic-ai/sdk";

// Focus areas we want to categorize projects into
const FOCUS_AREAS = [
  "AI & Machine Learning",
  "Privacy & Cryptography",
  "Trust Networks & Identity",
  "Impact Evaluation & Metrics",
  "Public Goods Funding",
  "Governance & Coordination",
  "Data & Analytics",
  "Developer Tools & Infrastructure",
  "Social Impact",
  "Education & Learning",
  "Climate & Environment",
  "Scientific Research",
  "Decentralized Systems",
  "Digital Public Goods",
  "Community Building",
] as const;

interface Project {
  id: string;
  title: string;
  description: string | null;
  technologies: string[];
  repositories: Array<{
    url: string;
    name: string | null;
    description: string | null;
  }>;
  updates: Array<{
    title: string;
    content: string;
  }>;
}

interface CategorizationResult {
  projectId: string;
  projectTitle: string;
  focusAreas: string[];
  reasoning: string;
}

async function getEventProjects(eventId: string): Promise<Project[]> {
  console.log(`\n📊 Fetching projects for event: ${eventId}...`);

  // Get accepted participants for this event
  const acceptedApplications = await db.application.findMany({
    where: {
      eventId,
      status: "ACCEPTED",
      applicationType: "RESIDENT",
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              projects: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  technologies: true,
                  repositories: {
                    select: {
                      url: true,
                      name: true,
                      description: true,
                    },
                    orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
                  },
                  updates: {
                    select: {
                      title: true,
                      content: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 3, // Get last 3 updates for context
                  },
                },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  // Flatten projects
  const projects = acceptedApplications
    .filter((app) => app.user?.profile?.projects?.length)
    .flatMap((app) => app.user!.profile!.projects);

  console.log(`✅ Found ${projects.length} projects`);
  return projects;
}

async function categorizeProject(
  project: Project,
  anthropic: Anthropic,
): Promise<CategorizationResult> {
  console.log(`\n🤖 Analyzing: "${project.title}"...`);

  // Build context from project information
  const projectContext = `
Project Title: ${project.title}

${project.description ? `Description: ${project.description}\n` : ""}

${project.technologies.length > 0 ? `Technologies: ${project.technologies.join(", ")}\n` : ""}

${
  project.repositories.length > 0
    ? `Repositories:
${project.repositories
  .map(
    (repo) =>
      `- ${repo.name ?? "Repository"} (${repo.url})${repo.description ? `: ${repo.description}` : ""}`,
  )
  .join("\n")}
`
    : ""
}

${
  project.updates.length > 0
    ? `Recent Updates:
${project.updates
  .map(
    (update, i) =>
      `${i + 1}. ${update.title}\n   ${update.content.substring(0, 200)}${update.content.length > 200 ? "..." : ""}`,
  )
  .join("\n\n")}
`
    : "No updates yet"
}
  `.trim();

  const systemPrompt = `You are an expert at categorizing technology and impact-focused projects.
Your task is to analyze project information and assign relevant focus areas from a predefined list.

Available Focus Areas:
${FOCUS_AREAS.map((area, i) => `${i + 1}. ${area}`).join("\n")}

Guidelines:
- Select 1-3 most relevant focus areas that best describe the project's primary goals and domain
- Base your selection on the project's title, description, technologies, and recent work
- Prioritize areas that represent the project's core mission, not just incidental technologies
- If a project clearly spans multiple areas, you can select up to 3 areas
- Provide brief reasoning for your selections`;

  const userPrompt = `Analyze this project and categorize it into the most relevant focus areas:

${projectContext}

Respond in JSON format:
{
  "focusAreas": ["Area 1", "Area 2"],
  "reasoning": "Brief explanation of why these areas were chosen"
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract JSON from response
    const responseText =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    // Parse JSON response (handle potential markdown code blocks)
    const jsonRegex = /\{[\s\S]*\}/;
    const jsonMatch = jsonRegex.exec(responseText);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]) as {
      focusAreas: string[];
      reasoning: string;
    };

    // Validate focus areas against our predefined list
    const validFocusAreas = result.focusAreas.filter((area) =>
      FOCUS_AREAS.includes(area as (typeof FOCUS_AREAS)[number]),
    );

    if (validFocusAreas.length === 0) {
      console.warn(`⚠️  No valid focus areas found for "${project.title}"`);
      console.warn(`   AI suggested: ${result.focusAreas.join(", ")}`);
      return {
        projectId: project.id,
        projectTitle: project.title,
        focusAreas: [],
        reasoning: result.reasoning,
      };
    }

    console.log(`   Focus Areas: ${validFocusAreas.join(", ")}`);
    console.log(`   Reasoning: ${result.reasoning.substring(0, 100)}...`);

    return {
      projectId: project.id,
      projectTitle: project.title,
      focusAreas: validFocusAreas,
      reasoning: result.reasoning,
    };
  } catch (error) {
    console.error(`❌ Error categorizing project "${project.title}":`, error);
    return {
      projectId: project.id,
      projectTitle: project.title,
      focusAreas: [],
      reasoning: `Error during categorization: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function updateProjectFocusAreas(
  results: CategorizationResult[],
): Promise<void> {
  console.log(`\n💾 Updating ${results.length} projects in database...`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const result of results) {
    try {
      await db.userProject.update({
        where: { id: result.projectId },
        data: { focusAreas: result.focusAreas },
      });
      updatedCount++;
      console.log(`   ✓ Updated: ${result.projectTitle}`);
    } catch (error) {
      errorCount++;
      console.error(
        `   ✗ Failed to update ${result.projectTitle}:`,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  console.log(`\n✅ Updated ${updatedCount} projects`);
  if (errorCount > 0) {
    console.log(`❌ Failed to update ${errorCount} projects`);
  }
}

async function generateReport(results: CategorizationResult[]): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("📊 CATEGORIZATION SUMMARY");
  console.log("=".repeat(80));

  // Count projects per focus area
  const focusAreaCounts: Record<string, number> = {};
  for (const result of results) {
    for (const area of result.focusAreas) {
      focusAreaCounts[area] = (focusAreaCounts[area] ?? 0) + 1;
    }
  }

  // Sort by count
  const sortedAreas = Object.entries(focusAreaCounts).sort(
    ([, a], [, b]) => b - a,
  );

  console.log(`\nTotal Projects: ${results.length}`);
  console.log(
    `Projects Categorized: ${results.filter((r) => r.focusAreas.length > 0).length}`,
  );
  console.log(
    `Projects Uncategorized: ${results.filter((r) => r.focusAreas.length === 0).length}`,
  );

  console.log("\n📈 Focus Area Distribution:");
  for (const [area, count] of sortedAreas) {
    const percentage = ((count / results.length) * 100).toFixed(1);
    const bar = "█".repeat(Math.floor(count / 2));
    console.log(`   ${area.padEnd(35)} ${bar} ${count} (${percentage}%)`);
  }

  console.log("\n📝 Detailed Project Categorization:");
  for (const result of results) {
    console.log(`\n   "${result.projectTitle}"`);
    if (result.focusAreas.length > 0) {
      console.log(`   → ${result.focusAreas.join(", ")}`);
    } else {
      console.log(`   → (Uncategorized)`);
    }
    console.log(`   Reasoning: ${result.reasoning.substring(0, 150)}...`);
  }

  console.log("\n" + "=".repeat(80));
}

async function main() {
  const eventId = process.argv[2];

  if (!eventId) {
    console.error("❌ Error: Event ID is required");
    console.error("\nUsage:");
    console.error("  bun run scripts/categorize-projects.ts <eventId>");
    console.error("\nExample:");
    console.error(
      "  bun run scripts/categorize-projects.ts funding-commons-residency-2025",
    );
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "❌ Error: ANTHROPIC_API_KEY environment variable is required",
    );
    console.error("   Add it to your .env.local file");
    process.exit(1);
  }

  console.log("🚀 Project Categorization Script");
  console.log("=".repeat(80));

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    // Step 1: Fetch projects
    const projects = await getEventProjects(eventId);

    if (projects.length === 0) {
      console.log("\n⚠️  No projects found for this event");
      process.exit(0);
    }

    // Step 2: Categorize each project
    const results: CategorizationResult[] = [];
    for (const project of projects) {
      const result = await categorizeProject(project, anthropic);
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Step 3: Update database
    await updateProjectFocusAreas(results);

    // Step 4: Generate report
    await generateReport(results);

    console.log("\n✅ Categorization complete!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

void main();
