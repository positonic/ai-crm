/**
 * Import Chiang Mai Residency (Residency 2024) project data from CSV.
 * Creates User, UserProfile, Application, UserProject, and Repository records.
 *
 * Usage:
 *   bun scripts/import-chiang-mai-projects.ts <csv-file-path>
 *   Example: bun scripts/import-chiang-mai-projects.ts imports/chiang-mai-projects.csv
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as csv from "csv-parser";

const prisma = new PrismaClient();

// Event slug for Chiang Mai residency
const CHIANG_MAI_EVENT_SLUG = "ftc-residency-chiang-mai";

// CSV column names (adjust these to match your actual CSV headers)
const CSV_COLUMNS = {
  event: "Event",
  status: "Status",
  name: "Name",
  email: "Email",
  owner: "Owner",
  owners: "Owners",
  subTitle: "Sub title",
  description: "Description",
  text: "Text",
  dappLink: "Dapp link",
  githubLink: "Github link",
  themes: "Themes",
};

type CSVRow = Record<string, string>;

interface ImportStats {
  total: number;
  filtered: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; name: string; error: string }>;
}

/**
 * Read CSV file and return parsed rows.
 */
async function readCSV(filePath: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = [];
    fs.createReadStream(filePath)
      .pipe(csv.default())
      .on("data", (data: CSVRow) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

/**
 * Find or create a user by email.
 */
async function findOrCreateUser(email: string, name: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (user) {
    console.log(`  Found existing user: ${normalizedEmail}`);
    return user.id;
  }

  // Create new user
  user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name.trim(),
      role: "user",
    },
    select: { id: true },
  });

  console.log(`  Created new user: ${normalizedEmail}`);
  return user.id;
}

/**
 * Find or create a user profile.
 */
async function findOrCreateProfile(
  userId: string,
  bio: string | null,
): Promise<string> {
  let profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (profile) {
    // Update bio if provided and profile exists
    if (bio) {
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: { bio },
      });
    }
    return profile.id;
  }

  // Create new profile
  profile = await prisma.userProfile.create({
    data: {
      userId,
      bio: bio ?? undefined,
      skillsSource: "imported",
    },
    select: { id: true },
  });

  console.log(`  Created user profile`);
  return profile.id;
}

/**
 * Create or update application for the event.
 */
async function createApplication(
  userId: string,
  email: string,
  eventId: string,
): Promise<string> {
  // Check if application already exists
  const existing = await prisma.application.findFirst({
    where: {
      userId,
      eventId,
    },
    select: { id: true },
  });

  if (existing) {
    console.log(`  Found existing application`);
    return existing.id;
  }

  // Create new application
  const application = await prisma.application.create({
    data: {
      userId,
      eventId,
      email: email.trim().toLowerCase(),
      status: "ACCEPTED",
      applicationType: "RESIDENT",
      submittedAt: new Date(),
      isComplete: true,
      completedAt: new Date(),
    },
    select: { id: true },
  });

  console.log(`  Created application (ACCEPTED)`);
  return application.id;
}

/**
 * Create a project for the user.
 */
async function createProject(
  profileId: string,
  title: string,
  description: string | null,
  liveUrl: string | null,
  githubUrl: string | null,
  focusAreas: string[],
): Promise<string> {
  // Check if project already exists (by title and profile)
  const existing = await prisma.userProject.findFirst({
    where: {
      profileId,
      title,
    },
    select: { id: true },
  });

  if (existing) {
    console.log(`  Found existing project: ${title}`);
    return existing.id;
  }

  // Create new project
  const project = await prisma.userProject.create({
    data: {
      profileId,
      title,
      description,
      liveUrl,
      githubUrl,
      focusAreas,
    },
    select: { id: true },
  });

  console.log(`  Created project: ${title}`);
  return project.id;
}

/**
 * Create a repository for a project if GitHub URL is provided.
 */
async function createRepository(
  projectId: string,
  githubUrl: string,
): Promise<void> {
  // Check if repository already exists
  const existing = await prisma.repository.findFirst({
    where: {
      projectId,
      url: githubUrl,
    },
  });

  if (existing) {
    console.log(`  Repository already exists`);
    return;
  }

  // Create repository
  await prisma.repository.create({
    data: {
      projectId,
      url: githubUrl,
      isPrimary: true,
    },
  });

  console.log(`  Created repository`);
}

/**
 * Parse focus areas from themes string.
 */
function parseFocusAreas(themes: string | undefined): string[] {
  if (!themes) return [];

  return themes
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Extract owner names from CSV row.
 */
function getOwnerNames(row: CSVRow): string[] {
  const owner = row[CSV_COLUMNS.owner]?.trim();
  const owners = row[CSV_COLUMNS.owners]?.trim();

  // Prefer 'Owners' column if it exists and has content
  if (owners) {
    return owners
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }

  if (owner) {
    return [owner];
  }

  return [];
}

/**
 * Main import function.
 */
async function importProjects(csvFilePath: string): Promise<ImportStats> {
  const stats: ImportStats = {
    total: 0,
    filtered: 0,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  console.log(`\n📖 Reading CSV file: ${csvFilePath}\n`);
  const csvData = await readCSV(csvFilePath);
  stats.total = csvData.length;

  console.log(`📊 Found ${csvData.length} total rows in CSV\n`);

  // Get the Chiang Mai event
  const event = await prisma.event.findFirst({
    where: {
      OR: [{ slug: CHIANG_MAI_EVENT_SLUG }, { id: CHIANG_MAI_EVENT_SLUG }],
    },
    select: { id: true, name: true },
  });

  if (!event) {
    throw new Error(
      `Event not found: ${CHIANG_MAI_EVENT_SLUG}. Please create the event first.`,
    );
  }

  console.log(`🎯 Target event: ${event.name} (${event.id})\n`);

  // Filter for Residency 2024 and Active status
  const filteredRows = csvData.filter((row) => {
    const eventName = row[CSV_COLUMNS.event]?.trim();
    const status = row[CSV_COLUMNS.status]?.trim();
    return eventName === "Residency 2024" && status === "Active";
  });

  stats.filtered = filteredRows.length;
  console.log(
    `🔍 Filtered to ${filteredRows.length} rows (Event = "Residency 2024", Status = "Active")\n`,
  );

  if (filteredRows.length === 0) {
    console.log("⚠️  No matching rows found. Check your CSV column headers.");
    console.log("   Expected columns:", Object.values(CSV_COLUMNS).join(", "));
    console.log("   Found columns:", Object.keys(csvData[0] ?? {}).join(", "));
    return stats;
  }

  // Process each row
  for (let i = 0; i < filteredRows.length; i++) {
    const row = filteredRows[i];
    if (!row) continue;

    const rowNumber = i + 1;
    const projectName = row[CSV_COLUMNS.name]?.trim() ?? `Project ${rowNumber}`;
    const email = row[CSV_COLUMNS.email]?.trim();

    console.log(
      `\n[${rowNumber}/${filteredRows.length}] Processing: ${projectName}`,
    );

    try {
      // Validate email
      if (!email) {
        console.log(`  ⚠️  Skipping: No email provided`);
        stats.skipped++;
        continue;
      }

      // Get owner names
      const ownerNames = getOwnerNames(row);
      const primaryOwnerName =
        ownerNames[0] ?? email.split("@")[0] ?? "Unknown";

      // Extract project data
      const description =
        row[CSV_COLUMNS.description]?.trim() ??
        row[CSV_COLUMNS.text]?.trim() ??
        null;
      const bio = row[CSV_COLUMNS.subTitle]?.trim() ?? null;
      const liveUrl = row[CSV_COLUMNS.dappLink]?.trim() ?? null;
      const githubUrl = row[CSV_COLUMNS.githubLink]?.trim() ?? null;
      const focusAreas = parseFocusAreas(row[CSV_COLUMNS.themes]);

      // Create user
      const userId = await findOrCreateUser(email, primaryOwnerName);

      // Create profile
      const profileId = await findOrCreateProfile(userId, bio);

      // Create application
      await createApplication(userId, email, event.id);

      // Create project
      const projectId = await createProject(
        profileId,
        projectName,
        description,
        liveUrl,
        githubUrl,
        focusAreas,
      );

      // Create repository if GitHub URL provided
      if (githubUrl) {
        await createRepository(projectId, githubUrl);
      }

      stats.imported++;
      console.log(`  ✅ Import complete`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      stats.errors.push({
        row: rowNumber,
        name: projectName,
        error: errorMessage,
      });
      console.error(`  ❌ Error: ${errorMessage}`);
    }
  }

  return stats;
}

/**
 * Main entry point.
 */
async function main() {
  console.log("🚀 Chiang Mai Residency Project Import\n");
  console.log("=".repeat(50));

  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(
      "❌ Usage: bun scripts/import-chiang-mai-projects.ts <csv-file-path>",
    );
    console.error(
      "   Example: bun scripts/import-chiang-mai-projects.ts imports/chiang-mai-projects.csv",
    );
    process.exit(1);
  }

  const csvFilePath = args[0];

  if (!csvFilePath || !fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  try {
    const stats = await importProjects(csvFilePath);

    console.log("\n" + "=".repeat(50));
    console.log("🎉 Import completed!\n");
    console.log("📊 Statistics:");
    console.log(`   Total rows in CSV: ${stats.total}`);
    console.log(`   Rows matching filter: ${stats.filtered}`);
    console.log(`   Successfully imported: ${stats.imported}`);
    console.log(`   Skipped (no email): ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      for (const error of stats.errors) {
        console.log(`   Row ${error.row} (${error.name}): ${error.error}`);
      }
    }
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

void main()
  .catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
