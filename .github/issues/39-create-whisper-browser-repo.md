---
title: "chore: Create fundingthecommons/whisper-browser repo"
labels: architecture,workstream:transcription,good first issue
parent: 26
---

## Scope

Create a reusable browser-side Whisper transcription package, extracted from the alpha-chrome-plugin.

### Purpose

Run OpenAI Whisper entirely in the browser -- no server uploads, no API costs, no privacy concerns. Audio never leaves the device. This has **standalone value** for any web application that needs speech-to-text.

### How it works

Proven architecture from [alpha-chrome-plugin](../alpha-chrome-plugin):

1. **AudioWorklet** captures microphone audio at 16kHz, emits 5-second PCM chunks
2. **Web Worker** runs `@huggingface/transformers` pipeline with ONNX Runtime WASM backend
3. **Model**: `onnx-community/whisper-tiny.en` (quantized q8) -- downloads from HuggingFace, cached in browser
4. **Inference**: ~200-500ms per 5-second chunk on modern hardware
5. **Filtering**: Silence detection (RMS threshold) + hallucination filtering (blank audio, repetition)

### Package API (proposed)

```typescript
// React hook
const { transcript, isRecording, start, stop, status } = useWhisperBrowser({
  model: 'onnx-community/whisper-tiny.en',
  onChunk: (text) => console.log(text),
});

// Vanilla JS
const whisper = new WhisperBrowser({ model: '...' });
await whisper.init();
whisper.onresult = (text) => console.log(text);
whisper.start();
```

### Key files to extract from alpha-chrome-plugin

- `shared/speech-engine-whisper.js` -- main engine (mic, worklet, silence detection, hallucination filter)
- `shared/whisper-worker.js` -- Web Worker (model loading, inference)
- `shared/audio-processor.js` -- AudioWorklet (PCM chunking)

### Repo structure

```
whisper-browser/
  src/
    index.ts                -- main exports
    WhisperBrowser.ts       -- core class (vanilla JS)
    useWhisperBrowser.ts    -- React hook wrapper
    worker.ts               -- Web Worker source
    audio-processor.ts      -- AudioWorklet
    filters.ts              -- silence detection, hallucination filtering
  demo/                     -- standalone demo page
  README.md                 -- setup, API docs, browser support
  package.json
```

### Why this is a good first issue

- Self-contained (no platform dependencies)
- Working reference implementation exists
- Clear API surface
- High standalone value (attracts contributors beyond FtC)
- Good demo opportunity (live transcription in browser)

### Acceptance criteria

- [ ] Repo created under fundingthecommons org
- [ ] Core transcription working in browser
- [ ] React hook and vanilla JS API
- [ ] Demo page with live mic transcription
- [ ] README with browser support matrix
- [ ] Published to npm (optional for POC)
