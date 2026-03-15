/**
 * Import real speakers for "Intelligence at the Frontier" from CSV.
 *
 * Reads scripts/iatf-speakers.csv, upserts User + UserProfile records
 * matching by email. Only updates fields that have real values in the CSV
 * (skips empty strings and "UNCLEAR" placeholders).
 *
 * Usage:
 *   bunx tsx scripts/import-iatf-speakers.ts           # Dry run (default)
 *   bunx tsx scripts/import-iatf-speakers.ts --apply    # Actually write to DB
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// ── Name overrides for rows where the Name column is a URL ──────────
const NAME_OVERRIDES: Record<string, { firstName: string; surname: string }> = {
  "liz@metagov.org": { firstName: "Liz", surname: "Barry" },
  "meta.sj@gmail.com": { firstName: "SJ", surname: "Klein" },
  "paul@astera.org": { firstName: "Paul", surname: "Riechers" },
  "esben@kran.ai": { firstName: "Esben", surname: "Kran" },
  "joshua.z.tan@gmail.com": { firstName: "Joshua", surname: "Tan" },
};

// ── Helpers ─────────────────────────────────────────────────────────

function cleanValue(val: string): string | null {
  const trimmed = val.trim();
  if (!trimmed || trimmed.toUpperCase() === "UNCLEAR") return null;
  return trimmed;
}

function cleanEmail(raw: string): string | null {
  let val = raw.trim();
  if (!val) return null;
  // Handle comma-separated emails (take first)
  if (val.includes(",")) {
    val = val.split(",")[0]!.trim();
  }
  // Strip mailto: prefix
  val = val.replace(/^mailto:/i, "").trim();
  if (!val || !val.includes("@")) return null;
  return val.toLowerCase();
}

function splitName(
  fullName: string,
  email: string,
): { firstName: string; surname: string } {
  // Check overrides first (for URL-as-name rows)
  const override = NAME_OVERRIDES[email];
  if (override) return override;

  const name = fullName.trim();
  // If name looks like a URL, skip
  if (name.startsWith("http")) {
    return { firstName: name, surname: "" };
  }

  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0]!, surname: "" };
  }
  const surname = parts.pop()!;
  const firstName = parts.join(" ");
  return { firstName, surname };
}

function normalizeTwitter(raw: string | null): string | null {
  if (!raw) return null;
  // Strip @ prefix, store as https://x.com/handle
  const handle = raw.replace(/^@/, "");
  return `https://x.com/${handle}`;
}

// ── CSV Parsing ─────────────────────────────────────────────────────

interface CsvRow {
  status: string;
  name: string;
  organization: string | null;
  jobTitle: string | null;
  linkedin: string | null;
  website: string | null;
  twitter: string | null;
  email: string | null;
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Strip BOM
  const clean = content.replace(/^\uFEFF/, "");
  const lines = clean.split("\n");
  const rows: CsvRow[] = [];

  // Skip BOM and header
  const startIdx = 1;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    // Parse CSV respecting quoted fields
    const fields = parseCsvLine(line);
    if (fields.length < 7) continue;

    rows.push({
      status: fields[0]?.trim() ?? "",
      name: fields[1]?.trim() ?? "",
      organization: cleanValue(fields[2] ?? ""),
      jobTitle: cleanValue(fields[3] ?? ""),
      linkedin: cleanValue(fields[4] ?? ""),
      website: cleanValue(fields[5] ?? ""),
      twitter: cleanValue(fields[6] ?? ""),
      email: cleanEmail(fields[7] ?? ""),
    });
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(__dirname, "iatf-speakers.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  console.log(`Parsed ${rows.length} rows from CSV\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.email) {
      console.log(`  SKIP (no email): ${row.name}`);
      skipped++;
      continue;
    }

    const { firstName, surname } = splitName(row.name, row.email);
    const twitterUrl = normalizeTwitter(row.twitter);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: row.email },
      include: { profile: true },
    });

    const action = existing ? "UPDATE" : "CREATE";

    // Build profile update data — only include non-null CSV values
    const profileData: Record<string, string> = {};
    if (row.organization) profileData.company = row.organization;
    if (row.jobTitle) profileData.jobTitle = row.jobTitle;
    if (row.linkedin) profileData.linkedinUrl = row.linkedin;
    if (row.website) profileData.website = row.website;
    if (twitterUrl) profileData.twitterUrl = twitterUrl;

    const profileFields = Object.keys(profileData).join(", ");

    console.log(
      `  ${action}: ${firstName} ${surname} <${row.email}>` +
        (profileFields ? ` [${profileFields}]` : ""),
    );

    if (APPLY) {
      const user = await prisma.user.upsert({
        where: { email: row.email },
        update: {
          // Only update name if user was created without one
          ...(existing?.firstName ? {} : { firstName }),
          ...(existing?.surname ? {} : { surname }),
        },
        create: {
          email: row.email,
          firstName,
          surname,
        },
      });

      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: profileData,
        create: {
          userId: user.id,
          ...profileData,
        },
      });

      if (action === "CREATE") created++;
      else updated++;
    } else {
      if (action === "CREATE") created++;
      else updated++;
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Summary${APPLY ? "" : " (DRY RUN)"}:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);

  if (!APPLY) {
    console.log(`\nRun with --apply to write changes to the database.`);
  }
}

void main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
