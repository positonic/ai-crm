import OpenAI from "openai";
import { type PrismaClient } from "@prisma/client";

export interface TopicClusterResult {
  label: string;
  keywords: string[];
  mentionCount: number;
  sourceExcerpts: string[];
}

interface RawTopicCluster {
  label?: unknown;
  keywords?: unknown;
  mentionCount?: unknown;
  sourceExcerpts?: unknown;
}

export class TopicClusteringService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY environment variable is missing");
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({ apiKey });
  }

  async clusterTopics(
    deliberationId: string,
    db: PrismaClient,
  ): Promise<TopicClusterResult[]> {
    // 1. Fetch COMPLETED transcriptions for this deliberation
    const transcriptions = await db.transcription.findMany({
      where: {
        deliberationId,
        status: "COMPLETED",
        transcript: { not: null },
      },
      select: { transcript: true, title: true },
    });

    if (transcriptions.length === 0) {
      throw new Error(
        "No completed transcriptions found for this deliberation",
      );
    }

    // 2. Concatenate transcript text
    const combinedText = transcriptions
      .map(
        (t) =>
          `--- ${t.title} ---\n${t.transcript ?? ""}`,
      )
      .join("\n\n");

    // 3. Send to GPT-4o for topic extraction
    const clusters = await this.extractTopics(combinedText);

    // 4. Delete existing TopicCluster records for this deliberation
    await db.topicCluster.deleteMany({
      where: { deliberationId },
    });

    // 5. Create new TopicCluster records
    await db.topicCluster.createMany({
      data: clusters.map((cluster) => ({
        deliberationId,
        label: cluster.label,
        keywords: cluster.keywords,
        mentionCount: cluster.mentionCount,
        sourceExcerpts: cluster.sourceExcerpts,
      })),
    });

    return clusters;
  }

  private async extractTopics(
    transcriptText: string,
  ): Promise<TopicClusterResult[]> {
    const systemPrompt = `You are analyzing conference deliberation transcripts to identify key discussion topics.

Extract the most important topics discussed across the transcripts. For each topic, provide:
- label: A concise topic name (3-8 words)
- keywords: 3-7 related keywords or phrases
- mentionCount: Approximate number of times this topic is discussed or referenced
- sourceExcerpts: 1-3 short verbatim quotes from the transcripts that best represent this topic (max 200 chars each)

Return a JSON array of topic objects. Identify the top 10-15 most significant topics, ranked by importance and frequency of discussion.

IMPORTANT: Return ONLY a JSON array, no markdown formatting or code blocks.`;

    const userPrompt = `Analyze the following deliberation transcripts and extract the key discussion topics:

${transcriptText.slice(0, 100000)}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    const responseText = response.choices[0]?.message?.content ?? "";

    return this.parseAndValidate(responseText);
  }

  private parseAndValidate(responseText: string): TopicClusterResult[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Fallback: extract JSON array from markdown code blocks
      const match = /\[[\s\S]*\]/.exec(responseText);
      if (!match) {
        throw new Error("Failed to parse topic clustering response as JSON");
      }
      parsed = JSON.parse(match[0]);
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Expected JSON array from topic clustering response");
    }

    const MAX_TOPICS = 15;
    const clusters: TopicClusterResult[] = [];

    for (const raw of parsed.slice(0, MAX_TOPICS) as RawTopicCluster[]) {
      const label =
        typeof raw.label === "string" ? raw.label.trim() : "";
      if (!label) continue;

      const keywords = Array.isArray(raw.keywords)
        ? (raw.keywords as unknown[])
            .filter((k): k is string => typeof k === "string")
            .map((k) => k.trim())
            .filter(Boolean)
            .slice(0, 7)
        : [];

      const mentionCount =
        typeof raw.mentionCount === "number"
          ? Math.max(0, Math.round(raw.mentionCount))
          : 0;

      const sourceExcerpts = Array.isArray(raw.sourceExcerpts)
        ? (raw.sourceExcerpts as unknown[])
            .filter((e): e is string => typeof e === "string")
            .map((e) => e.trim().slice(0, 200))
            .filter(Boolean)
            .slice(0, 3)
        : [];

      clusters.push({ label, keywords, mentionCount, sourceExcerpts });
    }

    return clusters;
  }
}

export function getTopicClusteringService(): TopicClusteringService {
  return new TopicClusteringService();
}
