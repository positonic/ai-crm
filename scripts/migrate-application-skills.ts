#!/usr/bin/env tsx

/**
 * Application Skills Migration Script
 *
 * Migrates technical skills from ApplicationResponse to UserSkills
 *
 * This script:
 * 1. Finds all ApplicationResponses for the technical_skills question (ID: cmeh86j5t001cuo43kgixf7t1)
 * 2. Parses the skills array from the answer field
 * 3. Normalizes skill names and creates Skills records if needed
 * 4. Creates UserSkills records linking users to their skills
 * 5. Increments popularity counters for each skill
 *
 * Usage:
 *   bun run scripts/migrate-application-skills.ts              # Dry run (preview only)
 *   bun run scripts/migrate-application-skills.ts --execute    # Actually migrate data
 *   bun run scripts/migrate-application-skills.ts --event-id <id>  # Specific event only
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Command line options
const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const EVENT_ID = args.includes("--event-id")
  ? args[args.indexOf("--event-id") + 1]
  : undefined;

// The specific question ID for technical_skills
const TECHNICAL_SKILLS_QUESTION_ID = "cmeh86j5t001cuo43kgixf7t1";

// Skill categorization mapping
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
  reactjs: "React",
  "react.js": "React",
  react: "React",
  vuejs: "Vue",
  "vue.js": "Vue",
  vue: "Vue",
  angularjs: "Angular",
  angular: "Angular",
  typescript: "TypeScript",
  ts: "TypeScript",
  javascript: "JavaScript",
  js: "JavaScript",
  nodejs: "Node.js",
  "node.js": "Node.js",
  node: "Node.js",
  nextjs: "Next.js",
  "next.js": "Next.js",
  next: "Next.js",
  postgresql: "PostgreSQL",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  mongo: "MongoDB",
  "smart contracts": "Smart Contracts",
  "smart-contracts": "Smart Contracts",
  smartcontracts: "Smart Contracts",
  web3: "Web3",
  "web3.js": "Web3.js",
  defi: "DeFi",
  "ui/ux": "UI/UX",
  uiux: "UI/UX",
  "ui ux": "UI/UX",
  "product management": "Product Management",
  "project management": "Project Management",
  "machine learning": "Machine Learning",
  ml: "Machine Learning",
  "artificial intelligence": "Artificial Intelligence",
  ai: "Artificial Intelligence",
  "react native": "React Native",
  "react-native": "React Native",
  "github actions": "GitHub Actions",
  "ci/cd": "CI/CD",
  cicd: "CI/CD",
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

  return null;
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
    return {
      id: `new_skill_${Date.now()}_${Math.random()}`,
      name: normalized,
      isNew: true,
    };
  }

  const newSkill = await prisma.skills.create({
    data: {
      name: normalized,
      category: inferCategory(normalized),
      popularity: 0,
      isActive: true,
    },
  });

  return { id: newSkill.id, name: newSkill.name, isNew: true };
}

interface MigrationStats {
  usersProcessed: number;
  skillsCreated: number;
  userSkillsCreated: number;
  userSkillsSkipped: number;
  errors: number;
  invalidSkillArrays: number;
}

interface UserSkillData {
  userId: string;
  userName: string | null;
  skills: string[];
  applicationId: string;
  eventName: string;
  applicationDate: Date;
  status: string;
}

async function collectData(): Promise<UserSkillData[]> {
  console.log("📊 Collecting technical skills from applications...\n");

  // Find all technical_skills responses using the specific question ID
  const skillResponses = await prisma.applicationResponse.findMany({
    where: {
      questionId: TECHNICAL_SKILLS_QUESTION_ID,
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
        },
      },
    },
    orderBy: {
      application: {
        createdAt: "desc",
      },
    },
  });

  const userSkillsData: UserSkillData[] = [];
  const seenUsers = new Set<string>();

  for (const response of skillResponses) {
    const { application } = response;

    if (!application.userId) {
      console.log(`⚠️  Skipping response ${response.id}: no userId`);
      continue;
    }

    // Use most recent application per user
    if (seenUsers.has(application.userId)) {
      continue;
    }
    seenUsers.add(application.userId);

    // Parse skills array from answer
    let skills: string[];
    try {
      const parsed: unknown = JSON.parse(response.answer);
      if (Array.isArray(parsed)) {
        skills = parsed.filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0,
        );
      } else {
        console.log(
          `⚠️  Invalid skills format for user ${application.user?.name ?? application.userId}: not an array`,
        );
        continue;
      }
    } catch {
      console.log(
        `⚠️  Invalid JSON for user ${application.user?.name ?? application.userId}: ${response.answer}`,
      );
      continue;
    }

    if (skills.length === 0) {
      console.log(
        `⚠️  Empty skills array for user ${application.user?.name ?? application.userId}`,
      );
      continue;
    }

    userSkillsData.push({
      userId: application.userId,
      userName: application.user?.name ?? null,
      skills,
      applicationId: application.id,
      eventName: application.event.name,
      applicationDate: application.createdAt,
      status: application.status,
    });
  }

  return userSkillsData;
}

async function migrateUserSkills(
  userData: UserSkillData,
  stats: MigrationStats,
): Promise<void> {
  const { userId, userName, skills } = userData;

  console.log(`\n👤 User: ${userName ?? userId}`);
  console.log(
    `   Application: ${userData.applicationDate.toISOString().split("T")[0]}`,
  );
  console.log(`   Status: ${userData.status}`);
  console.log(`   Skills (${skills.length}): ${skills.join(", ")}`);
  console.log(`   Actions:`);

  for (const skillName of skills) {
    try {
      // Find or create skill
      const skill = await findOrCreateSkill(skillName);

      if (skill.isNew) {
        console.log(`   ✓ Created skill "${skill.name}"`);
        stats.skillsCreated++;
      }

      // Check if UserSkills record already exists
      const existingUserSkill = await prisma.userSkills.findUnique({
        where: {
          userId_skillId: {
            userId: userId,
            skillId: skill.id,
          },
        },
      });

      if (existingUserSkill) {
        console.log(
          `   ⚠️  UserSkills already exists for "${skill.name}", skipping`,
        );
        stats.userSkillsSkipped++;
        continue;
      }

      // Create new UserSkills record
      if (!DRY_RUN) {
        await prisma.userSkills.create({
          data: {
            userId: userId,
            skillId: skill.id,
          },
        });

        // Increment skill popularity
        await prisma.skills.update({
          where: { id: skill.id },
          data: {
            popularity: { increment: 1 },
          },
        });
      }

      console.log(`   ✓ Created UserSkills(${userId}, ${skill.name})`);
      stats.userSkillsCreated++;
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
    userSkillsSkipped: 0,
    errors: 0,
    invalidSkillArrays: 0,
  };

  console.log("🔄 Application Skills Migration");
  console.log("═══════════════════════════════════════\n");
  console.log(`📝 Using question ID: ${TECHNICAL_SKILLS_QUESTION_ID}\n`);

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
    const userSkillsData = await collectData();

    console.log(
      `\nFound ${userSkillsData.length} users with technical skills\n`,
    );
    console.log("─────────────────────────────────────────\n");

    if (userSkillsData.length === 0) {
      console.log("✅ No skills to migrate\n");
      return;
    }

    // Process each user
    for (const userData of userSkillsData) {
      await migrateUserSkills(userData, stats);
    }

    // Print summary
    console.log("\n");
    console.log("═══════════════════════════════════════");
    console.log("📊 MIGRATION SUMMARY");
    console.log("═══════════════════════════════════════\n");
    console.log(`Users processed:        ${stats.usersProcessed}`);
    console.log(`Skills created:         ${stats.skillsCreated}`);
    console.log(`UserSkills created:     ${stats.userSkillsCreated}`);
    console.log(`UserSkills skipped:     ${stats.userSkillsSkipped}`);
    console.log(`Errors:                 ${stats.errors}`);
    console.log("");

    if (DRY_RUN) {
      console.log("⚠️  This was a DRY RUN - no changes were made");
      console.log("   Run with --execute flag to apply changes\n");
    } else {
      console.log("✅ Migration completed successfully!\n");

      // Run verification query
      const totalUserSkills = await prisma.userSkills.count();
      const totalSkills = await prisma.skills.count();
      console.log(`✓ Verified: ${totalUserSkills} UserSkills records exist`);
      console.log(`✓ Verified: ${totalSkills} Skills in catalog\n`);
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
