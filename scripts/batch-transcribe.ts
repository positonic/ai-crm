#!/usr/bin/env bun
/**
 * Batch Transcription Pipeline
 *
 * Converts audio files (iPhone Voice Memos M4A, MP3, etc.) to WAV,
 * transcribes via OpenAI Whisper API, and uploads to Exponential.
 *
 * Usage:
 *   OPENAI_API_KEY=xxx EXPONENTIAL_API_KEY=xxx EXPONENTIAL_URL=https://app.example.com \
 *     bun run scripts/batch-transcribe.ts <audio-file-or-directory> [--floor "Floor 14 Main Lounge"]
 *
 * Supports: .m4a, .mp3, .wav, .ogg, .flac, .aac, .webm
 * Requires: ffmpeg installed (brew install ffmpeg)
 */

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { basename, extname, join, resolve } from "path";
import { tmpdir } from "os";

// --- Configuration ---

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EXPONENTIAL_API_KEY = process.env.EXPONENTIAL_API_KEY;
const EXPONENTIAL_URL = process.env.EXPONENTIAL_URL;
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? "whisper-1";
const MAX_CHUNK_SIZE_MB = 24; // Whisper API limit is 25MB, leave margin
const CHUNK_DURATION_SECONDS = 600; // 10 min chunks for splitting

const SUPPORTED_EXTENSIONS = new Set([
  ".m4a",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".webm",
]);

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is required");
  process.exit(1);
}
if (!EXPONENTIAL_API_KEY) {
  console.error("EXPONENTIAL_API_KEY is required");
  process.exit(1);
}
if (!EXPONENTIAL_URL) {
  console.error("EXPONENTIAL_URL is required");
  process.exit(1);
}

// --- Parse CLI args ---

const args = process.argv.slice(2);
let inputPath = "";
let floorTitle = "Batch Transcription";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--floor" && args[i + 1]) {
    floorTitle = args[i + 1]!;
    i++;
  } else if (!inputPath) {
    inputPath = args[i]!;
  }
}

if (!inputPath) {
  console.error(
    "Usage: bun run scripts/batch-transcribe.ts <audio-file-or-directory> [--floor 'Floor Name']"
  );
  process.exit(1);
}

// --- FFmpeg helpers ---

async function runFFmpeg(args: string[]): Promise<void> {
  const proc = Bun.spawn(["ffmpeg", "-y", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`ffmpeg failed (exit ${exitCode}): ${stderr.slice(-500)}`);
  }
}

async function convertToWav(inputFile: string, outputFile: string): Promise<void> {
  console.log(`  Converting to WAV: ${basename(inputFile)}`);
  await runFFmpeg([
    "-i",
    inputFile,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-f",
    "wav",
    outputFile,
  ]);
}

async function splitAudio(
  wavFile: string,
  outputDir: string
): Promise<string[]> {
  const fileSize = statSync(wavFile).size;
  const fileSizeMB = fileSize / (1024 * 1024);

  if (fileSizeMB <= MAX_CHUNK_SIZE_MB) {
    return [wavFile];
  }

  console.log(
    `  File is ${fileSizeMB.toFixed(1)}MB, splitting into chunks...`
  );

  const chunkPattern = join(outputDir, "chunk_%03d.wav");
  await runFFmpeg([
    "-i",
    wavFile,
    "-f",
    "segment",
    "-segment_time",
    String(CHUNK_DURATION_SECONDS),
    "-ar",
    "16000",
    "-ac",
    "1",
    chunkPattern,
  ]);

  // Find generated chunks
  const chunks = readdirSync(outputDir)
    .filter((f) => f.startsWith("chunk_") && f.endsWith(".wav"))
    .sort()
    .map((f) => join(outputDir, f));

  console.log(`  Split into ${chunks.length} chunks`);
  return chunks;
}

// --- OpenAI Whisper API ---

async function transcribeChunk(wavFile: string): Promise<string> {
  const file = Bun.file(wavFile);
  const formData = new FormData();
  formData.append("file", file, basename(wavFile));
  formData.append("model", WHISPER_MODEL);
  formData.append("response_format", "text");
  formData.append("language", "en");

  const res = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper API error (${res.status}): ${errText}`);
  }

  return (await res.text()).trim();
}

// --- Exponential API ---

async function createManualTranscription(
  title: string,
  transcription: string,
  meetingDate?: Date
): Promise<string> {
  // Use startSession + saveTranscription (API key auth) instead of
  // createManualTranscription (which requires JWT)
  const startRes = await fetch(
    `${EXPONENTIAL_URL}/api/trpc/transcription.startSession`,
    {
      method: "POST",
      headers: {
        "x-api-key": EXPONENTIAL_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: {
          projectId: process.env.PROJECT_ID ?? null,
          workspaceId: process.env.WORKSPACE_ID ?? null,
          title,
        },
      }),
    }
  );

  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`startSession failed (${startRes.status}): ${text}`);
  }

  const startData = (await startRes.json()) as {
    result: { data: { json: { id: string } } };
  };
  const sessionId = startData.result.data.json.id;

  // Save the full transcription
  const saveRes = await fetch(
    `${EXPONENTIAL_URL}/api/trpc/transcription.saveTranscription`,
    {
      method: "POST",
      headers: {
        "x-api-key": EXPONENTIAL_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: {
          id: sessionId,
          transcription,
        },
      }),
    }
  );

  if (!saveRes.ok) {
    const text = await saveRes.text();
    throw new Error(`saveTranscription failed (${saveRes.status}): ${text}`);
  }

  return sessionId;
}

// --- Process a single audio file ---

async function processFile(filePath: string): Promise<void> {
  const name = basename(filePath, extname(filePath));
  console.log(`\nProcessing: ${basename(filePath)}`);

  const tempDir = join(tmpdir(), `batch-transcribe-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    // Step 1: Convert to WAV
    const wavFile = join(tempDir, `${name}.wav`);
    const ext = extname(filePath).toLowerCase();

    if (ext === ".wav") {
      // Still re-encode to ensure 16kHz mono
      await convertToWav(filePath, wavFile);
    } else {
      await convertToWav(filePath, wavFile);
    }

    // Step 2: Split if needed
    const chunks = await splitAudio(wavFile, tempDir);

    // Step 3: Transcribe each chunk
    const transcripts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const label =
        chunks.length > 1 ? ` (chunk ${i + 1}/${chunks.length})` : "";
      console.log(`  Transcribing${label}...`);
      const text = await transcribeChunk(chunk);
      transcripts.push(text);
    }

    const fullTranscript = transcripts.join("\n\n");

    if (!fullTranscript.trim()) {
      console.log("  No speech detected, skipping upload.");
      return;
    }

    console.log(
      `  Transcript: ${fullTranscript.length} chars, ${fullTranscript.split(/\s+/).length} words`
    );

    // Step 4: Upload to exponential
    const title = `${floorTitle} — ${name}`;
    console.log(`  Uploading to exponential: "${title}"`);
    const sessionId = await createManualTranscription(title, fullTranscript);
    console.log(`  Done! Session: ${sessionId}`);
  } finally {
    // Cleanup temp files
    try {
      const files = readdirSync(tempDir);
      for (const f of files) {
        unlinkSync(join(tempDir, f));
      }
      require("fs").rmdirSync(tempDir);
    } catch {
      // Best effort cleanup
    }
  }
}

// --- Entry point ---

async function main(): Promise<void> {
  const resolved = resolve(inputPath);

  if (!existsSync(resolved)) {
    console.error(`Path not found: ${resolved}`);
    process.exit(1);
  }

  // Check ffmpeg is available
  const ffmpegCheck = Bun.spawn(["which", "ffmpeg"], { stdout: "pipe" });
  if ((await ffmpegCheck.exited) !== 0) {
    console.error("ffmpeg not found. Install with: brew install ffmpeg");
    process.exit(1);
  }

  const stat = statSync(resolved);
  let files: string[];

  if (stat.isDirectory()) {
    files = readdirSync(resolved)
      .filter((f) => SUPPORTED_EXTENSIONS.has(extname(f).toLowerCase()))
      .sort()
      .map((f) => join(resolved, f));

    if (files.length === 0) {
      console.error(
        `No supported audio files found in: ${resolved}`
      );
      console.error(
        `Supported: ${[...SUPPORTED_EXTENSIONS].join(", ")}`
      );
      process.exit(1);
    }

    console.log(`Found ${files.length} audio file(s) in ${resolved}`);
  } else {
    files = [resolved];
  }

  console.log(`Floor: ${floorTitle}`);
  console.log(`API: ${EXPONENTIAL_URL}`);
  console.log("");

  let succeeded = 0;
  let failed = 0;

  for (const file of files) {
    try {
      await processFile(file);
      succeeded++;
    } catch (err) {
      console.error(
        `  ERROR: ${err instanceof Error ? err.message : String(err)}`
      );
      failed++;
    }
  }

  console.log(`\nComplete: ${succeeded} succeeded, ${failed} failed`);
}

void main();
