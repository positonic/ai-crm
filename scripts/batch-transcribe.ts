#!/usr/bin/env bun
/**
 * Batch Transcription Pipeline
 *
 * Transcribes audio/video files via ElevenLabs Scribe v2 with speaker
 * diarization, then uploads transcripts to the app via POST /api/transcription.
 *
 * Reads ELEVENLABS_API_KEY, TRANSCRIPTION_API_KEY, and APP_URL from .env.local automatically.
 *
 * Usage:
 *   bun run scripts/batch-transcribe.ts <audio-file-or-directory> [--floor "Floor 14 Main Lounge"]
 *
 * Options:
 *   --floor "Name"       Title prefix for uploaded transcriptions
 *   --event-id ID        Link transcriptions to an event (CUID)
 *   --event-slug SLUG    Link transcriptions to an event (by URL slug)
 *   --deliberation-id ID Link transcriptions to a deliberation
 *   --speakers N         Max expected speakers per file (default: 10)
 *   --language en        Language code (default: auto-detect)
 *   --no-diarize         Disable speaker diarization
 *   --tag-events         Tag non-speech events like laughter/applause
 *   --keyterms "a,b,c"   Comma-separated terms to bias recognition
 *   --local              Save transcripts as .txt files instead of uploading
 *   --upload             Upload existing .txt transcripts to the app (skip transcription)
 *
 * Supports: .m4a, .mp3, .wav, .ogg, .flac, .aac, .webm, .mp4, .mov, .mkv
 * No ffmpeg required — ElevenLabs accepts all major formats natively.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { basename, extname, join, resolve } from "path";

// --- Load .env.local ---

function loadEnvLocal(): void {
  const envPath = join(import.meta.dir, "..", ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

// --- Configuration ---

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const TRANSCRIPTION_API_KEY = process.env.TRANSCRIPTION_API_KEY;
const APP_URL = process.env.APP_URL;
const SCRIBE_MODEL = "scribe_v2";
const MAX_FILE_SIZE_GB = 3;

const SUPPORTED_EXTENSIONS = new Set([
  ".m4a",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".webm",
  ".mp4",
  ".mov",
  ".mkv",
]);

// ELEVENLABS_API_KEY validated later (not needed for --upload mode)

// --- Parse CLI args ---

const args = process.argv.slice(2);
let inputPath = "";
let floorTitle = "Batch Transcription";
let eventId = "";
let eventSlug = "";
let deliberationId = "";
let maxSpeakers = 10;
let languageCode = "";
let diarize = true;
let tagAudioEvents = false;
let keyterms: string[] = [];
let localOnly = false;
let uploadOnly = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--floor" && args[i + 1]) {
    floorTitle = args[i + 1]!;
    i++;
  } else if (arg === "--event-id" && args[i + 1]) {
    eventId = args[i + 1]!;
    i++;
  } else if (arg === "--event-slug" && args[i + 1]) {
    eventSlug = args[i + 1]!;
    i++;
  } else if (arg === "--deliberation-id" && args[i + 1]) {
    deliberationId = args[i + 1]!;
    i++;
  } else if (arg === "--speakers" && args[i + 1]) {
    maxSpeakers = parseInt(args[i + 1]!, 10);
    i++;
  } else if (arg === "--language" && args[i + 1]) {
    languageCode = args[i + 1]!;
    i++;
  } else if (arg === "--no-diarize") {
    diarize = false;
  } else if (arg === "--tag-events") {
    tagAudioEvents = true;
  } else if (arg === "--keyterms" && args[i + 1]) {
    keyterms = args[i + 1]!.split(",").map((t) => t.trim()).filter(Boolean);
    i++;
  } else if (arg === "--local") {
    localOnly = true;
  } else if (arg === "--upload") {
    uploadOnly = true;
  } else if (!inputPath) {
    inputPath = arg!;
  }
}

if (uploadOnly || !localOnly) {
  if (!TRANSCRIPTION_API_KEY) {
    console.error("TRANSCRIPTION_API_KEY is required (or use --local to save as files)");
    process.exit(1);
  }
  if (!APP_URL) {
    console.error("APP_URL is required (or use --local to save as files)");
    process.exit(1);
  }
}

if (!uploadOnly && !ELEVENLABS_API_KEY) {
  console.error("ELEVENLABS_API_KEY is required (or use --upload to upload existing .txt files)");
  process.exit(1);
}

if (!inputPath) {
  console.error(
    "Usage: bun run scripts/batch-transcribe.ts <audio-file-or-directory> [--floor 'Floor Name']",
  );
  process.exit(1);
}

// --- ElevenLabs Scribe API ---

interface ScribeWord {
  text: string;
  start: number;
  end: number;
  type: "word" | "spacing" | "audio_event";
  speaker_id?: string;
}

interface ScribeResponse {
  language_code: string;
  language_probability: number;
  text: string;
  words: ScribeWord[];
}

async function transcribeFile(filePath: string): Promise<ScribeResponse> {
  const file = Bun.file(filePath);
  const fileSizeGB = statSync(filePath).size / (1024 * 1024 * 1024);

  if (fileSizeGB > MAX_FILE_SIZE_GB) {
    throw new Error(
      `File is ${fileSizeGB.toFixed(1)}GB — exceeds ElevenLabs ${MAX_FILE_SIZE_GB}GB limit`,
    );
  }

  const formData = new FormData();
  formData.append("file", file, basename(filePath));
  formData.append("model_id", SCRIBE_MODEL);
  formData.append("diarize", String(diarize));
  formData.append("tag_audio_events", String(tagAudioEvents));
  formData.append("timestamps_granularity", "word");

  if (diarize && maxSpeakers > 0) {
    formData.append("num_speakers", String(maxSpeakers));
  }
  if (languageCode) {
    formData.append("language_code", languageCode);
  }
  if (keyterms.length > 0) {
    for (const term of keyterms) {
      formData.append("keyterms[]", term);
    }
  }

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY!,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs API error (${res.status}): ${errText}`);
  }

  return (await res.json()) as ScribeResponse;
}

// --- Format transcript with speaker labels ---

function formatTranscript(response: ScribeResponse): string {
  if (!diarize) {
    return response.text;
  }

  // Group words by speaker turns
  const turns: { speaker: string; text: string }[] = [];
  let currentSpeaker = "";
  let currentText = "";

  for (const word of response.words) {
    if (word.type === "audio_event") {
      currentText += ` ${word.text}`;
      continue;
    }
    if (word.type === "spacing") {
      currentText += word.text;
      continue;
    }

    const speaker = word.speaker_id ?? "unknown";
    if (speaker !== currentSpeaker && currentText.trim()) {
      turns.push({ speaker: currentSpeaker, text: currentText.trim() });
      currentText = "";
    }
    currentSpeaker = speaker;
    currentText += word.text;
  }

  if (currentText.trim()) {
    turns.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  return turns
    .map((turn) => `[${turn.speaker}]: ${turn.text}`)
    .join("\n\n");
}

// --- App Transcription API (POST /api/transcription) ---

interface TranscriptionUploadResult {
  id: string;
  sourceSessionId: string | null;
  status: string;
  created: boolean;
}

async function uploadTranscription(
  title: string,
  transcript: string,
  sourceFileName: string,
): Promise<TranscriptionUploadResult> {
  const body: Record<string, string> = {
    title,
    transcript,
    source: "API",
    status: "COMPLETED",
    sourceSessionId: `batch-${sourceFileName}`,
    audioFileName: sourceFileName,
  };

  if (eventId) body.eventId = eventId;
  if (eventSlug) body.eventSlug = eventSlug;
  if (deliberationId) body.deliberationId = deliberationId;

  const res = await fetch(`${APP_URL}/api/transcription`, {
    method: "POST",
    headers: {
      "x-api-key": TRANSCRIPTION_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  return (await res.json()) as TranscriptionUploadResult;
}

// --- Upload an existing .txt transcript ---

async function uploadTextFile(filePath: string): Promise<void> {
  const name = basename(filePath, extname(filePath));
  const transcript = readFileSync(filePath, "utf-8").trim();

  if (!transcript) {
    console.log(`\nSkipping empty file: ${basename(filePath)}`);
    return;
  }

  const wordCount = transcript.split(/\s+/).length;
  console.log(`\nUploading: ${basename(filePath)} (${wordCount} words)`);

  const title = `${floorTitle} — ${name}`;
  const result = await uploadTranscription(title, transcript, basename(filePath));
  console.log(`  Done! ID: ${result.id} (${result.created ? "created" : "updated"})`);
}

// --- Process a single audio file ---

async function processFile(filePath: string): Promise<void> {
  const name = basename(filePath, extname(filePath));
  const fileSize = statSync(filePath).size;
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
  console.log(`\nProcessing: ${basename(filePath)} (${fileSizeMB}MB)`);

  // Transcribe directly — no conversion or chunking needed
  console.log(`  Transcribing via ElevenLabs Scribe v2...`);
  const response = await transcribeFile(filePath);

  if (!response.text.trim()) {
    console.log("  No speech detected, skipping upload.");
    return;
  }

  const transcript = formatTranscript(response);

  // Count unique speakers
  if (diarize) {
    const speakers = new Set(
      response.words
        .filter((w) => w.speaker_id)
        .map((w) => w.speaker_id),
    );
    console.log(`  Detected ${speakers.size} speaker(s)`);
  }

  console.log(
    `  Language: ${response.language_code} (${(response.language_probability * 100).toFixed(0)}% confidence)`,
  );
  console.log(
    `  Transcript: ${transcript.length} chars, ${transcript.split(/\s+/).length} words`,
  );

  const title = `${floorTitle} — ${name}`;

  if (localOnly) {
    // Save as local text file next to the original
    const outputPath = join(resolve(filePath, ".."), `${name}.txt`);
    writeFileSync(outputPath, transcript, "utf-8");
    console.log(`  Saved to: ${outputPath}`);
  } else {
    // Upload to app via POST /api/transcription
    console.log(`  Uploading: "${title}"`);
    const result = await uploadTranscription(title, transcript, basename(filePath));
    console.log(`  Done! ID: ${result.id} (${result.created ? "created" : "updated"})`);
  }
}

// --- Entry point ---

async function main(): Promise<void> {
  const resolved = resolve(inputPath);

  if (!existsSync(resolved)) {
    console.error(`Path not found: ${resolved}`);
    process.exit(1);
  }

  const stat = statSync(resolved);
  let files: string[];

  const fileExtensions = uploadOnly ? new Set([".txt"]) : SUPPORTED_EXTENSIONS;

  if (stat.isDirectory()) {
    files = readdirSync(resolved)
      .filter((f) => fileExtensions.has(extname(f).toLowerCase()))
      .sort()
      .map((f) => join(resolved, f));

    if (files.length === 0) {
      console.error(`No ${uploadOnly ? ".txt" : "supported audio"} files found in: ${resolved}`);
      if (!uploadOnly) console.error(`Supported: ${[...SUPPORTED_EXTENSIONS].join(", ")}`);
      process.exit(1);
    }

    console.log(`Found ${files.length} ${uploadOnly ? "transcript" : "audio"} file(s) in ${resolved}`);
  } else {
    files = [resolved];
  }

  console.log(`Floor: ${floorTitle}`);
  if (uploadOnly) {
    console.log(`Mode: upload existing transcripts`);
  } else {
    console.log(`Model: ${SCRIBE_MODEL}`);
    console.log(`Diarization: ${diarize ? `on (max ${maxSpeakers} speakers)` : "off"}`);
  }
  if (eventId) console.log(`Event ID: ${eventId}`);
  if (eventSlug) console.log(`Event slug: ${eventSlug}`);
  if (deliberationId) console.log(`Deliberation: ${deliberationId}`);
  console.log(`Output: ${localOnly ? "local .txt files" : APP_URL}`);
  console.log("");

  let succeeded = 0;
  let failed = 0;

  for (const file of files) {
    try {
      if (uploadOnly) {
        await uploadTextFile(file);
      } else {
        await processFile(file);
      }
      succeeded++;
    } catch (err) {
      console.error(
        `  ERROR: ${err instanceof Error ? err.message : String(err)}`,
      );
      failed++;
    }
  }

  console.log(`\nComplete: ${succeeded} succeeded, ${failed} failed`);
}

void main();
