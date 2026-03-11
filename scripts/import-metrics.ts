/**
 * Import metrics from CSV file
 *
 * Usage:
 *   bun run scripts/import-metrics.ts path/to/metrics.csv
 */

import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { db } from "~/server/db";
import {
  type MetricType,
  type CollectionMethod,
  type MetricCadence,
  type MetricTimePeriod,
} from "@prisma/client";

interface CsvRow {
  Name: string;
  "All software projects": string;
  "Attestation oriented": string;
  "Before / During / After": string;
  "Builder metric": string;
  Cadence: string;
  "Collection Method": string;
  "Custom Evaluation": string;
  "Dependency tracking": string;
  "Deployer account": string;
  "Environmental / Social good": string;
  "FTC: Projects": string;
  "Git metric": string;
  "Hypercerts used": string;
  ImpactEvaluators: string;
  "Is OnChain": string;
  "Metric type": string;
  Notes: string;
  "OffChain APIs": string;
  POC: string;
  "Project ID needed": string;
  "Relevant to BBI": string;
  "Self reporting": string;
  Source: string;
  "Time period": string;
  Type: string;
  "Unit of metric": string;
  "ZK Email": string;
  quantity: string;
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "1";
}

function parseMetricTypes(
  builderMetric: string,
  gitMetric: string,
  isOnChain: string,
  environmentalSocialGood: string,
): MetricType[] {
  const types: MetricType[] = [];

  if (parseBoolean(builderMetric)) types.push("BUILDER");
  if (parseBoolean(gitMetric)) types.push("GIT");
  if (parseBoolean(isOnChain)) types.push("ONCHAIN");
  if (parseBoolean(environmentalSocialGood)) types.push("ENVIRONMENTAL");

  // Default to CUSTOM if no specific type
  if (types.length === 0) types.push("CUSTOM");

  return types;
}

function parseCollectionMethod(
  method: string,
  selfReporting: string,
  offChainApis: string,
  isOnChain: string,
): CollectionMethod {
  const normalized = method.trim().toLowerCase();

  if (
    parseBoolean(isOnChain) ||
    normalized.includes("on-chain") ||
    normalized.includes("onchain")
  ) {
    return "ONCHAIN";
  }
  if (parseBoolean(selfReporting) || normalized.includes("self")) {
    return "SELF_REPORTING";
  }
  if (
    offChainApis &&
    offChainApis.trim() !== "" &&
    offChainApis.toLowerCase() !== "no"
  ) {
    return "OFFCHAIN_API";
  }
  if (normalized.includes("automated") || normalized.includes("automatic")) {
    return "AUTOMATED";
  }

  return "MANUAL";
}

function parseCadence(cadence: string): MetricCadence {
  const normalized = cadence.trim().toLowerCase();

  if (normalized.includes("real") || normalized.includes("live"))
    return "REALTIME";
  if (normalized.includes("daily") || normalized.includes("day"))
    return "DAILY";
  if (normalized.includes("weekly") || normalized.includes("week"))
    return "WEEKLY";
  if (normalized.includes("monthly") || normalized.includes("month"))
    return "MONTHLY";
  if (normalized.includes("quarterly") || normalized.includes("quarter"))
    return "QUARTERLY";
  if (normalized.includes("annual") || normalized.includes("year"))
    return "ANNUAL";
  if (normalized.includes("custom")) return "CUSTOM";

  return "ONE_TIME";
}

function parseTimePeriod(timePeriod: string): MetricTimePeriod {
  const normalized = timePeriod.trim().toLowerCase();

  if (normalized.includes("before")) return "BEFORE";
  if (normalized.includes("after")) return "AFTER";
  if (normalized.includes("during")) return "DURING";
  if (normalized.includes("ongoing")) return "ONGOING";

  return "DURING"; // Default
}

function parseStringArray(value: string): string[] {
  if (!value || value.trim() === "" || value.toLowerCase() === "no") {
    return [];
  }

  // Split by comma and clean up
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseQuantity(quantity: string): number | null {
  if (!quantity || quantity.trim() === "") return null;

  const parsed = parseFloat(quantity);
  return isNaN(parsed) ? null : parsed;
}

async function importMetrics(csvPath: string) {
  console.log(`📊 Reading CSV file: ${csvPath}`);

  let fileContent = readFileSync(csvPath, "utf-8");

  // Remove BOM if present
  if (fileContent.charCodeAt(0) === 0xfeff) {
    fileContent = fileContent.slice(1);
  }

  const records: CsvRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Handle BOM automatically
  });

  console.log(`Found ${records.length} metrics to import\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of records) {
    try {
      // Skip if name is empty
      if (!row.Name || row.Name.trim() === "") {
        console.log(`⏭️  Skipping row with empty name`);
        skipped++;
        continue;
      }

      const slug = generateSlug(row.Name);

      // Check if metric already exists
      const existing = await db.metric.findUnique({
        where: { slug },
      });

      if (existing) {
        console.log(`⏭️  Skipping existing metric: ${row.Name}`);
        skipped++;
        continue;
      }

      // Parse metric data
      const metricTypes = parseMetricTypes(
        row["Builder metric"],
        row["Git metric"],
        row["Is OnChain"],
        row["Environmental / Social good"],
      );

      const collectionMethod = parseCollectionMethod(
        row["Collection Method"],
        row["Self reporting"],
        row["OffChain APIs"],
        row["Is OnChain"],
      );

      const cadence = parseCadence(row.Cadence);
      const timePeriod = parseTimePeriod(row["Time period"]);

      const ftcProjects = parseStringArray(row["FTC: Projects"]);
      const offChainApis = parseStringArray(row["OffChain APIs"]);
      const impactEvaluators = parseStringArray(row.ImpactEvaluators);

      // Create metric
      await db.metric.create({
        data: {
          name: row.Name,
          slug,
          description: row.Notes || null,
          metricType: metricTypes,
          unitOfMetric: row["Unit of metric"] || null,
          category: row.Type || null,
          collectionMethod,
          cadence,
          timePeriod,
          isOnChain: parseBoolean(row["Is OnChain"]),
          deployerAccount: row["Deployer account"] || null,
          offChainApis,
          gitMetric: parseBoolean(row["Git metric"]),
          dependencyTracking: parseBoolean(row["Dependency tracking"]),
          attestationOriented: parseBoolean(row["Attestation oriented"]),
          customEvaluation: parseBoolean(row["Custom Evaluation"]),
          selfReporting: parseBoolean(row["Self reporting"]),
          hypercertsUsed: parseBoolean(row["Hypercerts used"]),
          zkEmail: parseBoolean(row["ZK Email"]),
          allSoftwareProjects: parseBoolean(row["All software projects"]),
          ftcProjects,
          projectIdNeeded: parseBoolean(row["Project ID needed"]),
          environmentalSocialGood: parseBoolean(
            row["Environmental / Social good"],
          ),
          relevantToBBI: parseBoolean(row["Relevant to BBI"]),
          impactEvaluators,
          pocContact: row.POC || null,
          source: row.Source || null,
          notes: row.Notes || null,
          quantity: parseQuantity(row.quantity),
        },
      });

      console.log(`✅ Imported: ${row.Name}`);
      imported++;
    } catch (error) {
      console.error(`❌ Error importing metric "${row.Name}":`, error);
      errors++;
    }
  }

  console.log(`\n📈 Import Summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total: ${records.length}`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("❌ Error: Please provide a CSV file path");
  console.error("Usage: bun run scripts/import-metrics.ts path/to/metrics.csv");
  process.exit(1);
}

const csvPath = args[0] ?? "";

importMetrics(csvPath)
  .then(() => {
    console.log("\n✅ Import completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  });
