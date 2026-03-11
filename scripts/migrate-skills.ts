#!/usr/bin/env tsx

/**
 * Migration script to convert existing UserProfile.skills String[] data
 * to the new Skills and UserSkills table structure.
 *
 * This script:
 * 1. Extracts all unique skills from UserProfile.skills arrays
 * 2. Creates normalized Skills records with categories
 * 3. Creates UserSkills junction records linking users to skills
 * 4. Handles duplicates and variations (React vs ReactJS)
 * 5. Preserves existing UserProfile.skills for backward compatibility
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

// Skill normalization mapping (handles variations and duplicates)
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

function normalizeSkill(skill: string): string {
  const cleaned = skill.trim().toLowerCase();
  return SKILL_NORMALIZATIONS[cleaned] ?? skill.trim();
}

function categorizeSkill(normalizedSkill: string): string {
  const skillLower = normalizedSkill.toLowerCase();

  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.some((s) => skillLower.includes(s) || s.includes(skillLower))) {
      return category;
    }
  }

  return "Other";
}

async function main() {
  console.log("🚀 Starting skills migration...");

  // 1. Get all user profiles with skills
  console.log("\n📊 Analyzing existing skills data...");
  const profiles = await prisma.userProfile.findMany({
    where: {
      NOT: {
        skills: {
          equals: [],
        },
      },
    },
    select: {
      userId: true,
      skills: true,
    },
  });

  console.log(`Found ${profiles.length} profiles with skills`);

  // 2. Extract and normalize all unique skills
  const skillsMap = new Map<
    string,
    { count: number; users: string[]; category: string }
  >();
  let totalSkillEntries = 0;

  for (const profile of profiles) {
    for (const skill of profile.skills) {
      totalSkillEntries++;
      const normalizedSkill = normalizeSkill(skill);
      const category = categorizeSkill(normalizedSkill);

      if (skillsMap.has(normalizedSkill)) {
        const existing = skillsMap.get(normalizedSkill)!;
        existing.count++;
        existing.users.push(profile.userId);
      } else {
        skillsMap.set(normalizedSkill, {
          count: 1,
          users: [profile.userId],
          category,
        });
      }
    }
  }

  console.log(`📈 Found ${totalSkillEntries} total skill entries`);
  console.log(`🎯 Normalized to ${skillsMap.size} unique skills`);

  // Display category breakdown
  const categoryBreakdown = new Map<string, number>();
  for (const { category } of skillsMap.values()) {
    categoryBreakdown.set(category, (categoryBreakdown.get(category) ?? 0) + 1);
  }

  console.log("\n📊 Skills by category:");
  for (const [category, count] of categoryBreakdown.entries()) {
    console.log(`  ${category}: ${count} skills`);
  }

  // 3. Create Skills records
  console.log("\n🎯 Creating Skills records...");
  const createdSkills = new Map<string, string>(); // normalizedName -> skillId

  for (const [skillName, data] of skillsMap.entries()) {
    try {
      const skill = await prisma.skills.upsert({
        where: { name: skillName },
        create: {
          name: skillName,
          category: data.category,
          popularity: data.count,
          isActive: true,
        },
        update: {
          popularity: data.count,
          category: data.category,
        },
      });

      createdSkills.set(skillName, skill.id);

      if (createdSkills.size % 10 === 0) {
        process.stdout.write(
          `  Created ${createdSkills.size}/${skillsMap.size} skills...\r`,
        );
      }
    } catch (error) {
      console.error(`❌ Error creating skill "${skillName}":`, error);
    }
  }

  console.log(`\n✅ Created ${createdSkills.size} skills`);

  // 4. Create UserSkills junction records
  console.log("\n🔗 Creating UserSkills junction records...");
  let userSkillsCreated = 0;
  let userSkillsSkipped = 0;

  for (const profile of profiles) {
    for (const skill of profile.skills) {
      const normalizedSkill = normalizeSkill(skill);
      const skillId = createdSkills.get(normalizedSkill);

      if (!skillId) {
        console.warn(
          `⚠️  Skill "${normalizedSkill}" not found in created skills`,
        );
        continue;
      }

      try {
        await prisma.userSkills.upsert({
          where: {
            userId_skillId: {
              userId: profile.userId,
              skillId: skillId,
            },
          },
          create: {
            userId: profile.userId,
            skillId: skillId,
          },
          update: {}, // No updates needed for existing records
        });

        userSkillsCreated++;

        if (userSkillsCreated % 50 === 0) {
          process.stdout.write(
            `  Created ${userSkillsCreated} user-skill associations...\r`,
          );
        }
      } catch (error) {
        userSkillsSkipped++;
        // Skip duplicate entries silently
      }
    }
  }

  console.log(`\n✅ Created ${userSkillsCreated} user-skill associations`);
  if (userSkillsSkipped > 0) {
    console.log(`⏭️  Skipped ${userSkillsSkipped} duplicate associations`);
  }

  // 5. Verification and reporting
  console.log("\n🔍 Verifying migration...");

  const skillsCount = await prisma.skills.count();
  const userSkillsCount = await prisma.userSkills.count();
  const usersWithSkills = await prisma.userSkills.groupBy({
    by: ["userId"],
    _count: true,
  });

  console.log(`\n📊 Migration Summary:`);
  console.log(`  • Total Skills created: ${skillsCount}`);
  console.log(`  • Total UserSkills associations: ${userSkillsCount}`);
  console.log(`  • Users with migrated skills: ${usersWithSkills.length}`);
  console.log(`  • Original profiles with skills: ${profiles.length}`);

  // Top skills by popularity
  const topSkills = await prisma.skills.findMany({
    orderBy: { popularity: "desc" },
    take: 10,
    select: { name: true, category: true, popularity: true },
  });

  console.log(`\n🏆 Top 10 Skills by popularity:`);
  topSkills.forEach((skill, index) => {
    console.log(
      `  ${index + 1}. ${skill.name} (${skill.category}) - ${skill.popularity} users`,
    );
  });

  console.log("\n✅ Skills migration completed successfully!");
  console.log("\n📝 Next steps:");
  console.log(
    "  1. Run the application and test the new SkillsMultiSelect component",
  );
  console.log("  2. Verify that users can select skills and create new ones");
  console.log("  3. Check that existing UserProfile.skills data is preserved");
  console.log(
    "  4. Consider removing UserProfile.skills field after thorough testing",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error during skills migration:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
