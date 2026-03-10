#!/usr/bin/env bun
/**
 * Meetily → Exponential Sync Script
 *
 * Polls the local Meetily SQLite database for new transcript segments
 * and pushes them to the Exponential transcription API.
 *
 * Usage:
 *   EXPONENTIAL_API_KEY=xxx EXPONENTIAL_URL=https://app.example.com bun run scripts/meetily-sync.ts
 *
 * Optional env vars:
 *   MEETILY_DB_PATH    — Override SQLite path (default: ~/Library/Application Support/com.meetily.ai/meeting_minutes.sqlite)
 *   SYNC_INTERVAL_MS   — Poll interval in ms (default: 30000)
 *   FLOOR_TITLE        — Label for this floor/room (default: "Floor Transcription")
 *   PROJECT_ID         — Exponential project ID to associate transcripts with
 *   WORKSPACE_ID       — Exponential workspace ID
 */

import Database from "bun:sqlite";
import { homedir } from "os";
import { existsSync } from "fs";
import { join } from "path";

// --- Configuration ---

const EXPONENTIAL_API_KEY = process.env.EXPONENTIAL_API_KEY;
const EXPONENTIAL_URL = process.env.EXPONENTIAL_URL;
const MEETILY_DB_PATH =
  process.env.MEETILY_DB_PATH ??
  join(
    homedir(),
    "Library",
    "Application Support",
    "com.meetily.ai",
    "meeting_minutes.sqlite"
  );
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? "30000");
const FLOOR_TITLE = process.env.FLOOR_TITLE ?? "Floor Transcription";
const PROJECT_ID = process.env.PROJECT_ID ?? null;
const WORKSPACE_ID = process.env.WORKSPACE_ID ?? null;

if (!EXPONENTIAL_API_KEY) {
  console.error("EXPONENTIAL_API_KEY is required");
  process.exit(1);
}
if (!EXPONENTIAL_URL) {
  console.error("EXPONENTIAL_URL is required (e.g. https://app.example.com)");
  process.exit(1);
}

// --- Types ---

interface TranscriptRow {
  id: string;
  meeting_id: string;
  transcript: string;
  timestamp: string;
  audio_start_time: number | null;
  audio_end_time: number | null;
  duration: number | null;
}

interface SyncState {
  lastTimestamp: string;
  exponentialSessionId: string | null;
}

// --- Exponential API calls ---

async function startSession(title: string): Promise<string> {
  const url = `${EXPONENTIAL_URL}/api/trpc/transcription.startSession`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": EXPONENTIAL_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: {
        projectId: PROJECT_ID,
        workspaceId: WORKSPACE_ID,
        title,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`startSession failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    result: { data: { json: { id: string } } };
  };
  return data.result.data.json.id;
}

async function saveTranscription(
  sessionId: string,
  text: string
): Promise<void> {
  const url = `${EXPONENTIAL_URL}/api/trpc/transcription.saveTranscription`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": EXPONENTIAL_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: {
        id: sessionId,
        transcription: text,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`saveTranscription failed (${res.status}): ${text}`);
  }
}

// --- Meetily SQLite queries ---

function openMeetilyDb(): Database {
  if (!existsSync(MEETILY_DB_PATH)) {
    console.error(`Meetily database not found at: ${MEETILY_DB_PATH}`);
    console.error(
      "Make sure Meetily is installed and has been run at least once."
    );
    process.exit(1);
  }

  return new Database(MEETILY_DB_PATH, { readonly: true });
}

function getNewTranscripts(
  db: Database,
  sinceTimestamp: string
): TranscriptRow[] {
  const stmt = db.prepare(`
    SELECT id, meeting_id, transcript, timestamp,
           audio_start_time, audio_end_time, duration
    FROM transcripts
    WHERE timestamp > ?
    ORDER BY timestamp ASC
  `);

  return stmt.all(sinceTimestamp) as TranscriptRow[];
}

// --- Sync state persistence ---

const SYNC_STATE_PATH = join(
  homedir(),
  ".meetily-sync-state.json"
);

function loadSyncState(): SyncState {
  try {
    if (existsSync(SYNC_STATE_PATH)) {
      const raw = Bun.file(SYNC_STATE_PATH);
      // Use synchronous read
      const text = require("fs").readFileSync(SYNC_STATE_PATH, "utf-8");
      return JSON.parse(text) as SyncState;
    }
  } catch {
    console.warn("Could not load sync state, starting fresh");
  }
  return {
    lastTimestamp: "2000-01-01T00:00:00Z",
    exponentialSessionId: null,
  };
}

async function saveSyncState(state: SyncState): Promise<void> {
  await Bun.write(SYNC_STATE_PATH, JSON.stringify(state, null, 2));
}

// --- Main sync loop ---

async function syncOnce(
  db: Database,
  state: SyncState
): Promise<SyncState> {
  const newSegments = getNewTranscripts(db, state.lastTimestamp);

  if (newSegments.length === 0) {
    return state;
  }

  console.log(
    `[${new Date().toISOString()}] Found ${newSegments.length} new segment(s)`
  );

  // Start session if we don't have one yet
  if (!state.exponentialSessionId) {
    const title = `${FLOOR_TITLE} — ${new Date().toLocaleDateString()}`;
    console.log(`Starting new session: "${title}"`);
    state.exponentialSessionId = await startSession(title);
    console.log(`Session created: ${state.exponentialSessionId}`);
  }

  // Combine new segments into a single text block with timestamps
  const textBlock = newSegments
    .map((seg) => {
      const timePrefix =
        seg.audio_start_time != null
          ? `[${formatTime(seg.audio_start_time)}] `
          : "";
      return `${timePrefix}${seg.transcript}`;
    })
    .join("\n");

  // Push to exponential
  await saveTranscription(state.exponentialSessionId, textBlock);

  const lastSegment = newSegments[newSegments.length - 1]!;
  state.lastTimestamp = lastSegment.timestamp;

  console.log(
    `Synced ${newSegments.length} segment(s), last timestamp: ${state.lastTimestamp}`
  );

  return state;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// --- Entry point ---

async function main(): Promise<void> {
  console.log("Meetily → Exponential Sync");
  console.log(`  DB: ${MEETILY_DB_PATH}`);
  console.log(`  API: ${EXPONENTIAL_URL}`);
  console.log(`  Floor: ${FLOOR_TITLE}`);
  console.log(`  Interval: ${SYNC_INTERVAL_MS}ms`);
  console.log(`  Project: ${PROJECT_ID ?? "(none)"}`);
  console.log(`  Workspace: ${WORKSPACE_ID ?? "(none)"}`);
  console.log("");

  const db = openMeetilyDb();
  let state = loadSyncState();

  if (state.exponentialSessionId) {
    console.log(`Resuming session: ${state.exponentialSessionId}`);
    console.log(`Last sync: ${state.lastTimestamp}`);
  }

  console.log("Watching for new transcripts...\n");

  // Initial sync
  state = await syncOnce(db, state);
  await saveSyncState(state);

  // Poll loop
  const interval = setInterval(async () => {
    try {
      state = await syncOnce(db, state);
      await saveSyncState(state);
    } catch (err) {
      console.error(
        `[${new Date().toISOString()}] Sync error:`,
        err instanceof Error ? err.message : err
      );
      // Don't crash — keep trying next interval
    }
  }, SYNC_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    clearInterval(interval);
    await saveSyncState(state);
    db.close();
    console.log("State saved. Goodbye.");
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    clearInterval(interval);
    await saveSyncState(state);
    db.close();
    process.exit(0);
  });
}

void main();
