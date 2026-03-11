#!/usr/bin/env bun

/**
 * Script to analyze all ApplicationQuestion fields and identify potential profile mappings
 * Run with: bun scripts/analyze-application-questions.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log(
    "🔍 Analyzing Application Questions for Profile Import Mapping...\n",
  );

  // Get all unique question keys across all events
  const questions = await db.applicationQuestion.findMany({
    select: {
      questionKey: true,
      questionEn: true,
      questionType: true,
      event: {
        select: {
          name: true,
          id: true,
        },
      },
    },
    orderBy: [{ questionKey: "asc" }, { event: { name: "asc" } }],
  });

  // Group by questionKey to see variations
  const questionGroups = new Map<
    string,
    Array<{
      questionEn: string;
      questionType: string;
      eventName: string;
      eventId: string;
    }>
  >();

  for (const q of questions) {
    if (!questionGroups.has(q.questionKey)) {
      questionGroups.set(q.questionKey, []);
    }
    questionGroups.get(q.questionKey)!.push({
      questionEn: q.questionEn,
      questionType: q.questionType,
      eventName: q.event?.name ?? "Unknown",
      eventId: q.event?.id ?? "unknown",
    });
  }

  console.log(
    `📊 Found ${questionGroups.size} unique question keys across ${questions.length} total questions\n`,
  );

  // Current profile field mappings
  const currentMappings = new Set([
    "technical_skills",
    "bio",
    "location",
    "company",
    "linkedin_url",
    "github_url",
  ]);

  console.log("✅ Currently Mapped Fields:");
  Array.from(currentMappings).forEach((key) => {
    if (questionGroups.has(key)) {
      const variations = questionGroups.get(key)!;
      console.log(`  ${key} → Profile field (${variations.length} events)`);
    } else {
      console.log(`  ${key} → Profile field (⚠️  NOT FOUND in any event)`);
    }
  });

  console.log("\n🔍 Potential Profile-Relevant Fields (Not Currently Mapped):");

  // Define patterns for profile-relevant fields
  const profilePatterns = [
    // Social media and professional profiles
    {
      pattern: /twitter|x_url|social/i,
      category: "Social Media",
      profileField: "twitterUrl",
    },
    {
      pattern: /instagram/i,
      category: "Social Media",
      profileField: "instagramUrl (new)",
    },
    {
      pattern: /youtube/i,
      category: "Social Media",
      profileField: "youtubeUrl (new)",
    },
    {
      pattern: /telegram/i,
      category: "Messaging",
      profileField: "telegramHandle",
    },
    {
      pattern: /discord/i,
      category: "Messaging",
      profileField: "discordHandle",
    },
    {
      pattern: /website|portfolio|personal_site/i,
      category: "Professional",
      profileField: "website",
    },

    // Personal info
    { pattern: /age|birth/i, category: "Personal", profileField: "age (new)" },
    {
      pattern: /gender|pronouns/i,
      category: "Personal",
      profileField: "pronouns (new)",
    },
    { pattern: /timezone/i, category: "Location", profileField: "timezone" },
    {
      pattern: /country|nationality/i,
      category: "Location",
      profileField: "country (new)",
    },
    { pattern: /languages?$/i, category: "Skills", profileField: "languages" },

    // Professional info
    {
      pattern: /job_title|title|role/i,
      category: "Professional",
      profileField: "jobTitle",
    },
    {
      pattern: /experience|years/i,
      category: "Professional",
      profileField: "yearsOfExperience",
    },
    {
      pattern: /salary|compensation/i,
      category: "Professional",
      profileField: "salaryExpectation (new)",
    },
    {
      pattern: /resume|cv/i,
      category: "Professional",
      profileField: "resumeUrl (new)",
    },

    // Interests and availability
    {
      pattern: /interests|hobbies/i,
      category: "Interests",
      profileField: "interests",
    },
    {
      pattern: /mentor/i,
      category: "Availability",
      profileField: "availableForMentoring",
    },
    {
      pattern: /hiring|job/i,
      category: "Availability",
      profileField: "availableForHiring",
    },
  ];

  const unmappedRelevant: Array<{
    questionKey: string;
    category: string;
    profileField: string;
    examples: Array<{
      questionEn: string;
      eventName: string;
      questionType: string;
    }>;
  }> = [];

  const unmappedOther: Array<{
    questionKey: string;
    examples: Array<{
      questionEn: string;
      eventName: string;
      questionType: string;
    }>;
  }> = [];

  for (const [questionKey, variations] of questionGroups) {
    if (currentMappings.has(questionKey)) continue; // Already mapped

    let matched = false;
    for (const { pattern, category, profileField } of profilePatterns) {
      if (pattern.test(questionKey)) {
        unmappedRelevant.push({
          questionKey,
          category,
          profileField,
          examples: variations.slice(0, 3), // Show max 3 examples
        });
        matched = true;
        break;
      }
    }

    if (!matched) {
      unmappedOther.push({
        questionKey,
        examples: variations.slice(0, 2),
      });
    }
  }

  // Display profile-relevant unmapped fields
  const categorized = new Map<string, typeof unmappedRelevant>();
  unmappedRelevant.forEach((field) => {
    if (!categorized.has(field.category)) {
      categorized.set(field.category, []);
    }
    categorized.get(field.category)!.push(field);
  });

  for (const [category, fields] of categorized) {
    console.log(`\n📋 ${category}:`);
    for (const field of fields) {
      console.log(`  ${field.questionKey} → ${field.profileField}`);
      field.examples.forEach((ex) => {
        console.log(
          `    "${ex.questionEn}" (${ex.eventName}) [${ex.questionType}]`,
        );
      });
    }
  }

  console.log(`\n❓ Other Unmapped Fields (${unmappedOther.length}):`);
  unmappedOther.slice(0, 10).forEach((field) => {
    // Show first 10
    console.log(`  ${field.questionKey}`);
    field.examples.forEach((ex) => {
      console.log(
        `    "${ex.questionEn}" (${ex.eventName}) [${ex.questionType}]`,
      );
    });
  });

  if (unmappedOther.length > 10) {
    console.log(`  ... and ${unmappedOther.length - 10} more`);
  }

  console.log("\n📈 Summary:");
  console.log(`  ✅ Currently mapped: ${currentMappings.size} fields`);
  console.log(
    `  🎯 Profile-relevant unmapped: ${unmappedRelevant.length} fields`,
  );
  console.log(`  ❓ Other unmapped: ${unmappedOther.length} fields`);
  console.log(`  📊 Total unique question keys: ${questionGroups.size}`);

  // Check for responses to these fields
  console.log(
    "\n🔍 Checking actual response data for profile-relevant fields...",
  );

  for (const field of unmappedRelevant.slice(0, 5)) {
    // Check first 5
    const responseCount = await db.applicationResponse.count({
      where: {
        question: {
          questionKey: field.questionKey,
        },
        answer: {
          not: "",
        },
      },
    });

    if (responseCount > 0) {
      // Get a sample response
      const sampleResponse = await db.applicationResponse.findFirst({
        where: {
          question: {
            questionKey: field.questionKey,
          },
          answer: {
            not: "",
          },
        },
        select: {
          answer: true,
        },
      });

      console.log(`  ${field.questionKey}: ${responseCount} responses`);
      if (sampleResponse?.answer) {
        const preview =
          sampleResponse.answer.length > 50
            ? sampleResponse.answer.substring(0, 50) + "..."
            : sampleResponse.answer;
        console.log(`    Sample: "${preview}"`);
      }
    }
  }

  console.log(
    "\n✨ Done! Use this analysis to enhance profile import mapping.",
  );
}

void (async () => {
  try {
    await main();
    console.log("\n🎉 Analysis complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();
