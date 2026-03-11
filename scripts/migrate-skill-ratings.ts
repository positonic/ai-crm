#!/usr/bin/env tsx

/**
 * Skill Ratings Migration Script
 *
 * Syncs skill expertise ratings (1-10 scale) from ApplicationResponse to UserSkills.experienceLevel
 *
 * This script:
 * 1. Finds all ApplicationResponses with skill_rating answers
 * 2. Matches them to corresponding technical_skills answers
 * 3. Normalizes skill names to match Skills catalog
 * 4. Creates/updates UserSkills records with experienceLevel
 * 5. Increments Skills.popularity counters
 *
 * Usage:
 *   bun run scripts/migrate-skill-ratings.ts              # Dry run (preview only)
 *   bun run scripts/migrate-skill-ratings.ts --execute    # Actually migrate data
 *   bun run scripts/migrate-skill-ratings.ts --event-id <id>  # Specific event only
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Command line options
const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const EVENT_ID = args.includes("--event-id")
  ? args[args.indexOf("--event-id") + 1]
  : undefined;

// Skill categorization mapping (from migrate-skills.ts)
const SKILL_CATEGORIES: Record<string, string[]> = {
  Frontend: [
    "react",
    "vue",
    "angular",
    "typescript",
    "javascript",
    "html",
    "css",
    "nextjs",
    "next.js",
    "svelte",
    "gatsby",
    "nuxt",
    "webpack",
    "vite",
    "tailwind",
    "bootstrap",
    "sass",
    "scss",
    "redux",
    "mobx",
    "zustand",
  ],
  Backend: [
    "nodejs",
    "node.js",
    "node",
    "python",
    "rust",
    "go",
    "golang",
    "java",
    "php",
    "ruby",
    "rails",
    "django",
    "flask",
    "express",
    "fastapi",
    "spring",
    "laravel",
    "nestjs",
    "deno",
    "bun",
  ],
  Blockchain: [
    "solidity",
    "smart contracts",
    "smart-contracts",
    "defi",
    "web3",
    "ethereum",
    "bitcoin",
    "crypto",
    "blockchain",
    "nft",
    "dao",
    "hardhat",
    "truffle",
    "foundry",
    "metamask",
    "ethers",
    "web3.js",
  ],
  Database: [
    "postgresql",
    "postgres",
    "mysql",
    "mongodb",
    "redis",
    "sqlite",
    "prisma",
    "typeorm",
    "sequelize",
    "drizzle",
    "supabase",
    "firebase",
  ],
  Design: [
    "figma",
    "ui/ux",
    "uiux",
    "ui",
    "ux",
    "product design",
    "graphic design",
    "adobe",
    "photoshop",
    "illustrator",
    "sketch",
    "design systems",
    "prototyping",
    "wireframing",
    "user research",
  ],
  DevOps: [
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure",
    "terraform",
    "ansible",
    "jenkins",
    "gitlab",
    "github actions",
    "ci/cd",
    "nginx",
    "apache",
    "linux",
    "bash",
    "shell",
    "monitoring",
    "logging",
  ],
  Mobile: [
    "react native",
    "react-native",
    "flutter",
    "swift",
    "kotlin",
    "ios",
    "android",
    "xamarin",
    "ionic",
    "cordova",
    "mobile development",
  ],
  "Data Science": [
    "machine learning",
    "ml",
    "ai",
    "artificial intelligence",
    "data analysis",
    "pandas",
    "numpy",
    "tensorflow",
    "pytorch",
    "scikit-learn",
    "jupyter",
    "r",
    "matlab",
    "statistics",
    "data visualization",
  ],
  Business: [
    "project management",
    "product management",
    "strategy",
    "business development",
    "marketing",
    "sales",
    "research",
    "analytics",
    "consulting",
    "entrepreneurship",
    "leadership",
    "team management",
    "agile",
    "scrum",
    "kanban",
  ],
};

// Skill normalization mapping
const SKILL_NORMALIZATIONS: Record<string, string> = {
  developer: "Developer",
  designer: "Designer",
  "project manager": "Project Manager",
  researcher: "Researcher",
  other: "Other",
};

// Infer category from skill name
function inferCategory(skillName: string): string | null {
  const normalized = skillName.toLowerCase();

  for (const [category, keywords] of Object.entries(SKILL_CATEGORIES)) {
    if (
      keywords.some(
        (keyword) =>
          normalized.includes(keyword) || keyword.includes(normalized),
      )
    ) {
      return category;
    }
  }

  // Default categories based on common patterns
  if (normalized.includes("developer") || normalized.includes("engineer"))
    return "Backend";
  if (normalized.includes("designer")) return "Design";
  if (normalized.includes("manager")) return "Business";
  if (normalized.includes("research")) return "Data Science";

  return null; // Will use default category from schema
}

// Normalize skill name
function normalizeSkillName(skillName: string): string {
  const trimmed = skillName.trim();
  const lower = trimmed.toLowerCase();

  // Check normalization mapping first
  if (SKILL_NORMALIZATIONS[lower]) {
    return SKILL_NORMALIZATIONS[lower];
  }

  // Capitalize first letter of each word
  return trimmed
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Find or create skill in catalog
async function findOrCreateSkill(
  skillName: string,
): Promise<{ id: string; name: string; isNew: boolean }> {
  const normalized = normalizeSkillName(skillName);

  // Try to find existing skill (case-insensitive)
  const existingSkill = await prisma.skills.findFirst({
    where: {
      name: {
        equals: normalized,
        mode: "insensitive",
      },
    },
  });

  if (existingSkill) {
    return { id: existingSkill.id, name: existingSkill.name, isNew: false };
  }

  // Create new skill
  if (DRY_RUN) {
    return { id: `new_skill_${Date.now()}`, name: normalized, isNew: true };
  }

  const newSkill = await prisma.skills.create({
    data: {
      name: normalized,
      category: inferCategory(normalized),
      popularity: 0,
    },
  });

  return { id: newSkill.id, name: newSkill.name, isNew: true };
}

interface MigrationStats {
  usersProcessed: number;
  skillsCreated: number;
  userSkillsCreated: number;
  userSkillsUpdated: number;
  errors: number;
  warnings: number;
  skipped: number;
}

interface UserSkillRating {
  userId: string;
  userName: string | null;
  rating: number;
  skills: string[];
  applicationId: string;
  eventName: string;
  applicationDate: Date;
}

async function collectData(): Promise<UserSkillRating[]> {
  console.log("📊 Collecting skill ratings from applications...\n");

  // Find all skill_rating responses
  const ratingResponses = await prisma.applicationResponse.findMany({
    where: {
      question: {
        questionKey: "skill_rating",
      },
      answer: {
        not: "",
      },
      ...(EVENT_ID && {
        application: {
          eventId: EVENT_ID,
        },
      }),
    },
    include: {
      application: {
        include: {
          event: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          responses: {
            include: {
              question: true,
            },
          },
        },
      },
    },
    orderBy: {
      application: {
        createdAt: "desc",
      },
    },
  });

  const userRatings: UserSkillRating[] = [];
  const seenUsers = new Set<string>();

  for (const ratingResponse of ratingResponses) {
    const { application } = ratingResponse;

    if (!application.userId) {
      console.log(`⚠️  Skipping response ${ratingResponse.id}: no userId`);
      continue;
    }

    // Use most recent application per user
    if (seenUsers.has(application.userId)) {
      continue;
    }
    seenUsers.add(application.userId);

    // Parse rating
    const ratingValue = parseInt(ratingResponse.answer);
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 10) {
      console.log(
        `⚠️  Invalid rating for user ${application.user?.name ?? application.userId}: ${ratingResponse.answer}`,
      );
      continue;
    }

    // Find technical_skills response from same application
    const skillsResponse = application.responses.find(
      (r) => r.question.questionKey === "technical_skills",
    );

    if (!skillsResponse || !skillsResponse.answer) {
      console.log(
        `⚠️  No technical_skills for user ${application.user?.name ?? application.userId}`,
      );
      continue;
    }

    // Parse skills array
    let skills: string[];
    try {
      skills = JSON.parse(skillsResponse.answer) as string[];
      if (!Array.isArray(skills) || skills.length === 0) {
        console.log(
          `⚠️  Empty skills array for user ${application.user?.name ?? application.userId}`,
        );
        continue;
      }
    } catch {
      console.log(
        `⚠️  Invalid skills JSON for user ${application.user?.name ?? application.userId}: ${skillsResponse.answer}`,
      );
      continue;
    }

    userRatings.push({
      userId: application.userId,
      userName: application.user?.name ?? null,
      rating: ratingValue,
      skills,
      applicationId: application.id,
      eventName: application.event.name,
      applicationDate: application.createdAt,
    });
  }

  return userRatings;
}

async function migrateUserSkills(
  userRating: UserSkillRating,
  stats: MigrationStats,
): Promise<void> {
  const { userId, userName, rating, skills } = userRating;

  console.log(`\n👤 User: ${userName ?? userId}`);
  console.log(`   Rating: ${rating}/10`);
  console.log(`   Skills: ${skills.join(", ")}`);
  console.log(`   Actions:`);

  for (const skillName of skills) {
    try {
      // Find or create skill
      const skill = await findOrCreateSkill(skillName);

      if (skill.isNew) {
        console.log(`   ✓ Created skill "${skill.name}"`);
        stats.skillsCreated++;
      } else {
        console.log(`   ✓ Found skill "${skill.name}"`);
      }

      // Check if UserSkills record exists
      const existingUserSkill = await prisma.userSkills.findUnique({
        where: {
          userId_skillId: {
            userId: userId,
            skillId: skill.id,
          },
        },
      });

      if (existingUserSkill) {
        // Update existing record
        if (!DRY_RUN) {
          await prisma.userSkills.update({
            where: { id: existingUserSkill.id },
            data: {
              experienceLevel: rating,
            },
          });
        }
        console.log(
          `   ✓ Updated UserSkills(${userId}, ${skill.name}, level=${rating})`,
        );
        stats.userSkillsUpdated++;
      } else {
        // Create new record
        if (!DRY_RUN) {
          await prisma.userSkills.create({
            data: {
              userId: userId,
              skillId: skill.id,
              experienceLevel: rating,
            },
          });
        }
        console.log(
          `   ✓ Created UserSkills(${userId}, ${skill.name}, level=${rating})`,
        );
        stats.userSkillsCreated++;
      }

      // Increment skill popularity
      if (!DRY_RUN && !existingUserSkill) {
        await prisma.skills.update({
          where: { id: skill.id },
          data: {
            popularity: { increment: 1 },
          },
        });
      }
    } catch (error) {
      console.log(
        `   ❌ Error processing skill "${skillName}": ${error instanceof Error ? error.message : String(error)}`,
      );
      stats.errors++;
    }
  }

  stats.usersProcessed++;
}

async function main() {
  const stats: MigrationStats = {
    usersProcessed: 0,
    skillsCreated: 0,
    userSkillsCreated: 0,
    userSkillsUpdated: 0,
    errors: 0,
    warnings: 0,
    skipped: 0,
  };

  console.log("🔄 Skill Ratings Migration");
  console.log("═══════════════════════════════════════\n");

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No changes will be made");
    console.log("   Use --execute flag to actually migrate data\n");
  } else {
    console.log("🚀 EXECUTE MODE - Changes will be saved to database\n");
  }

  if (EVENT_ID) {
    console.log(`📅 Filtering by event ID: ${EVENT_ID}\n`);
  }

  try {
    // Collect all data first
    const userRatings = await collectData();

    console.log(`\nFound ${userRatings.length} users with skill ratings\n`);
    console.log("─────────────────────────────────────────\n");

    if (userRatings.length === 0) {
      console.log("✅ No ratings to migrate\n");
      return;
    }

    // Process each user
    for (const userRating of userRatings) {
      await migrateUserSkills(userRating, stats);
    }

    // Print summary
    console.log("\n");
    console.log("═══════════════════════════════════════");
    console.log("📊 MIGRATION SUMMARY");
    console.log("═══════════════════════════════════════\n");
    console.log(`Users processed:        ${stats.usersProcessed}`);
    console.log(`Skills created:         ${stats.skillsCreated}`);
    console.log(`UserSkills created:     ${stats.userSkillsCreated}`);
    console.log(`UserSkills updated:     ${stats.userSkillsUpdated}`);
    console.log(`Errors:                 ${stats.errors}`);
    console.log(`Warnings:               ${stats.warnings}`);
    console.log(`Skipped:                ${stats.skipped}`);
    console.log("");

    if (DRY_RUN) {
      console.log("⚠️  This was a DRY RUN - no changes were made");
      console.log("   Run with --execute flag to apply changes\n");
    } else {
      console.log("✅ Migration completed successfully!\n");

      // Run verification query
      const totalWithLevels = await prisma.userSkills.count({
        where: { experienceLevel: { not: null } },
      });
      console.log(
        `✓ Verified: ${totalWithLevels} UserSkills records now have experience levels\n`,
      );
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
