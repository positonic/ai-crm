#!/usr/bin/env tsx

/**
 * Sentry → Beads Issue Sync
 *
 * Pulls unresolved issues from Sentry and creates beads for any
 * that haven't been imported yet (tracked via --external-ref).
 *
 * Usage:
 *   tsx scripts/sentry-to-beads.ts                    # Dry run (default)
 *   tsx scripts/sentry-to-beads.ts --apply            # Create beads for real
 *   tsx scripts/sentry-to-beads.ts --limit 5          # Only process first 5
 *   tsx scripts/sentry-to-beads.ts --env production   # Filter by environment
 *   tsx scripts/sentry-to-beads.ts --since 24h        # Issues from last 24 hours
 *   tsx scripts/sentry-to-beads.ts --verbose          # Show full details
 *
 * Required env vars:
 *   SENTRY_API_TOKEN - API auth token with project:read + event:read scopes
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Auto-load .env.local if SENTRY_API_TOKEN is not in environment
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  if (process.env.SENTRY_API_TOKEN) return;
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = /^([A-Z_]+)="?([^"]*)"?$/.exec(line);
      if (match?.[1] && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // .env.local not found, rely on environment
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SENTRY_ORG = "funding-the-commons";
const SENTRY_PROJECT = "ftc-platform-7k";
const SENTRY_API = "https://us.sentry.io/api/0";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  shortId: string;
  level: "fatal" | "error" | "warning" | "info" | "debug";
  status: string;
  firstSeen: string;
  lastSeen: string;
  count: string;
  userCount: number;
  permalink: string;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
  };
  isUnhandled?: boolean;
  platform: string;
  project: { slug: string };
}

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    apply: false,
    limit: 25,
    env: "",
    since: "",
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--apply":
        opts.apply = true;
        break;
      case "--limit":
        opts.limit = parseInt(args[++i] ?? "25", 10);
        break;
      case "--env":
        opts.env = args[++i] ?? "";
        break;
      case "--since":
        opts.since = args[++i] ?? "";
        break;
      case "--verbose":
        opts.verbose = true;
        break;
      case "--help":
        console.log(`
Sentry → Beads Issue Sync

Usage:
  tsx scripts/sentry-to-beads.ts [options]

Options:
  --apply          Actually create beads (default is dry-run)
  --limit <n>      Max issues to process (default: 25)
  --env <name>     Filter by Sentry environment (e.g. production)
  --since <period> Only issues first seen within period (e.g. 24h, 7d)
  --verbose        Show full issue details
  --help           Show this help
`);
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}. Use --help for usage.`);
        process.exit(1);
    }
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Sentry API
// ---------------------------------------------------------------------------

async function fetchSentryIssues(opts: {
  limit: number;
  env: string;
  since: string;
}): Promise<SentryIssue[]> {
  const token = process.env.SENTRY_API_TOKEN;
  if (!token) {
    console.error(
      "SENTRY_API_TOKEN is not set. Add it to .env.local or export it.",
    );
    process.exit(1);
  }

  const params = new URLSearchParams({
    query: "is:unresolved",
    limit: String(opts.limit),
    sort: "freq",
  });

  if (opts.env) {
    params.set("environment", opts.env);
  }
  if (opts.since) {
    params.set("query", `is:unresolved firstSeen:-${opts.since}`);
  }

  const url = `${SENTRY_API}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Sentry API error ${res.status}: ${body}`);
    process.exit(1);
  }

  return (await res.json()) as SentryIssue[];
}

// ---------------------------------------------------------------------------
// Beads helpers
// ---------------------------------------------------------------------------

function getExistingExternalRefs(): Set<string> {
  try {
    const output = execSync("bd list --status=open --json 2>/dev/null", {
      encoding: "utf-8",
      timeout: 10_000,
    });
    const issues = JSON.parse(output) as Array<{ external_ref?: string }>;
    const refs = new Set<string>();
    for (const issue of issues) {
      if (issue.external_ref) {
        refs.add(issue.external_ref);
      }
    }
    return refs;
  } catch {
    // If bd list --json isn't supported or fails, fall back to grep
    try {
      const output = execSync("bd list --status=open 2>/dev/null", {
        encoding: "utf-8",
        timeout: 10_000,
      });
      const refs = new Set<string>();
      const matches = output.matchAll(/sentry-(\d+)/g);
      for (const m of matches) {
        refs.add(`sentry-${m[1]}`);
      }
      return refs;
    } catch {
      return new Set<string>();
    }
  }
}

function sentryLevelToPriority(level: string, userCount: number): number {
  // P0=critical, P1=high, P2=medium, P3=low, P4=backlog
  if (level === "fatal") return 0;
  if (level === "error" && userCount >= 10) return 1;
  if (level === "error") return 2;
  if (level === "warning") return 3;
  return 4;
}

function createBead(issue: SentryIssue): string {
  const priority = sentryLevelToPriority(issue.level, issue.userCount);
  const externalRef = `sentry-${issue.id}`;

  const description = [
    issue.metadata.type
      ? `**${issue.metadata.type}**: ${issue.metadata.value ?? ""}`
      : "",
    issue.culprit ? `Location: \`${issue.culprit}\`` : "",
    `First seen: ${issue.firstSeen}`,
    `Occurrences: ${issue.count} | Users affected: ${issue.userCount}`,
    `Sentry: ${issue.permalink}`,
  ]
    .filter(Boolean)
    .join("\n");

  const title =
    issue.title.length > 120 ? issue.title.slice(0, 117) + "..." : issue.title;

  const cmd = [
    "bd create",
    `--title="${title.replace(/"/g, '\\"')}"`,
    "--type=bug",
    `--priority=${priority}`,
    `--description="${description.replace(/"/g, '\\"')}"`,
    `--external-ref="${externalRef}"`,
    `--labels="sentry,${issue.level}"`,
    "--silent",
  ].join(" ");

  const output = execSync(cmd, { encoding: "utf-8", timeout: 10_000 }).trim();
  return output; // bead ID
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  console.log(`\n  Sentry -> Beads sync`);
  console.log(`  Project: ${SENTRY_ORG}/${SENTRY_PROJECT}`);
  console.log(`  Mode: ${opts.apply ? "APPLY" : "DRY RUN"}`);
  if (opts.env) console.log(`  Environment: ${opts.env}`);
  if (opts.since) console.log(`  Since: ${opts.since}`);
  console.log();

  // Fetch issues from Sentry
  console.log("Fetching unresolved Sentry issues...");
  const issues = await fetchSentryIssues(opts);
  console.log(`Found ${issues.length} unresolved issue(s)\n`);

  if (issues.length === 0) {
    console.log("Nothing to sync.");
    return;
  }

  // Check which ones we already have as beads
  const existingRefs = getExistingExternalRefs();
  const newIssues = issues.filter((i) => !existingRefs.has(`sentry-${i.id}`));

  console.log(
    `Already tracked: ${issues.length - newIssues.length} | New: ${newIssues.length}\n`,
  );

  if (newIssues.length === 0) {
    console.log("All Sentry issues are already tracked as beads.");
    return;
  }

  // Display issues
  console.log("─".repeat(80));
  for (const issue of newIssues) {
    const priority = sentryLevelToPriority(issue.level, issue.userCount);
    console.log(
      `  [${issue.level.toUpperCase().padEnd(7)}] P${priority} | ${issue.count.padStart(5)} events | ${String(issue.userCount).padStart(3)} users`,
    );
    console.log(`  ${issue.title}`);
    if (issue.culprit) {
      console.log(`  -> ${issue.culprit}`);
    }
    if (opts.verbose) {
      console.log(`  First: ${issue.firstSeen} | Last: ${issue.lastSeen}`);
      console.log(`  URL: ${issue.permalink}`);
    }
    console.log();
  }
  console.log("─".repeat(80));

  // Create beads
  if (!opts.apply) {
    console.log(
      `\nDry run complete. Run with --apply to create ${newIssues.length} bead(s).`,
    );
    return;
  }

  console.log(`\nCreating ${newIssues.length} bead(s)...\n`);
  let created = 0;
  let failed = 0;

  for (const issue of newIssues) {
    try {
      const beadId = createBead(issue);
      console.log(
        `  Created ${beadId} <- sentry-${issue.id}: ${issue.title.slice(0, 60)}`,
      );
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED sentry-${issue.id}: ${msg}`);
      failed++;
    }
  }

  console.log(`\nDone. Created: ${created} | Failed: ${failed}`);

  if (created > 0) {
    console.log("\nRun `bd sync` to push new beads to git.");
  }
}

void main();
