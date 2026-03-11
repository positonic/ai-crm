import OpenAI from "openai";
import { type Prisma, type PrismaClient } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────

export interface ClassifiedPriority {
  priorityId: string;
  title: string;
  classification: "convergent" | "blind_spot" | "aspirational";
  reasoning: string;
  voteCount: number;
  relatedTopicLabels: string[];
}

export interface BlockerTheme {
  theme: string;
  description: string;
  affectedPriorities: string[];
  frequency: number;
}

export interface ResourceRecommendation {
  category: "funding" | "talent" | "tooling" | "other";
  recommendation: string;
  relatedPriorities: string[];
  urgency: "high" | "medium" | "low";
}

export interface AnalysisResult {
  synthesis: string;
  classifiedPriorities: ClassifiedPriority[];
  blockerThemes: BlockerTheme[];
  resourceRecommendations: ResourceRecommendation[];
  statistics: {
    totalPriorities: number;
    totalVotes: number;
    totalBlockers: number;
    totalResources: number;
    topicClusterCount: number;
    convergentCount: number;
    blindSpotCount: number;
    aspirationalCount: number;
  };
  generatedAt: string;
}

interface RawAnalysisResponse {
  synthesis?: unknown;
  classifiedPriorities?: unknown;
  blockerThemes?: unknown;
  resourceRecommendations?: unknown;
}

// ─── Service ───────────────────────────────────────────────

export class DeliberationAnalysisService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY environment variable is missing");
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({ apiKey });
  }

  async analyzeDeliberation(
    deliberationId: string,
    db: PrismaClient,
  ): Promise<AnalysisResult> {
    // 1. Fetch topic clusters (automated signal)
    const topicClusters = await db.topicCluster.findMany({
      where: { deliberationId },
      orderBy: { mentionCount: "desc" },
    });

    // 2. Fetch priorities with votes, blockers, resources (intentional signal)
    const priorities = await db.deliberationPriority.findMany({
      where: { deliberationId, isModerated: false },
      include: {
        _count: { select: { votes: true, blockers: true, resources: true } },
        blockers: { select: { description: true } },
        resources: { select: { category: true, description: true } },
      },
      orderBy: { votes: { _count: "desc" } },
    });

    if (priorities.length === 0) {
      throw new Error("No priorities found for this deliberation");
    }

    // 3. Build context for GPT-4o
    const topicContext = topicClusters
      .map(
        (tc) =>
          `- ${tc.label} (mentioned ~${tc.mentionCount}x): keywords: ${tc.keywords.join(", ")}`,
      )
      .join("\n");

    const priorityContext = priorities
      .map((p) => {
        const blockerText =
          p.blockers.length > 0
            ? ` | Blockers: ${p.blockers.map((b) => b.description).join("; ")}`
            : "";
        const resourceText =
          p.resources.length > 0
            ? ` | Resources: ${p.resources.map((r) => `[${r.category}] ${r.description}`).join("; ")}`
            : "";
        return `- "${p.title}" (${p._count.votes} votes, ${p._count.blockers} blockers)${p.description ? `: ${p.description}` : ""}${blockerText}${resourceText}`;
      })
      .join("\n");

    // 4. Send to GPT-4o for analysis
    const rawAnalysis = await this.runAnalysis(
      topicContext,
      priorityContext,
      priorities.map((p) => ({ id: p.id, title: p.title })),
    );

    // 5. Build statistics
    const totalVotes = priorities.reduce(
      (sum, p) => sum + p._count.votes,
      0,
    );
    const totalBlockers = priorities.reduce(
      (sum, p) => sum + p._count.blockers,
      0,
    );
    const totalResources = priorities.reduce(
      (sum, p) => sum + p._count.resources,
      0,
    );

    const convergentCount = rawAnalysis.classifiedPriorities.filter(
      (p) => p.classification === "convergent",
    ).length;
    const blindSpotCount = rawAnalysis.classifiedPriorities.filter(
      (p) => p.classification === "blind_spot",
    ).length;
    const aspirationalCount = rawAnalysis.classifiedPriorities.filter(
      (p) => p.classification === "aspirational",
    ).length;

    const result: AnalysisResult = {
      ...rawAnalysis,
      statistics: {
        totalPriorities: priorities.length,
        totalVotes,
        totalBlockers,
        totalResources,
        topicClusterCount: topicClusters.length,
        convergentCount,
        blindSpotCount,
        aspirationalCount,
      },
      generatedAt: new Date().toISOString(),
    };

    // 6. Store on Deliberation record
    await db.deliberation.update({
      where: { id: deliberationId },
      data: {
        analysisResult: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
      },
    });

    return result;
  }

  private async runAnalysis(
    topicContext: string,
    priorityContext: string,
    priorityList: { id: string; title: string }[],
  ): Promise<Omit<AnalysisResult, "statistics" | "generatedAt">> {
    const priorityIds = priorityList
      .map((p) => `  "${p.id}": "${p.title}"`)
      .join("\n");

    const systemPrompt = `You are analyzing a community deliberation that has two signal sources:

1. **Automated signal**: Topic clusters extracted from discussion transcripts (what people talked about)
2. **Intentional signal**: Priorities submitted and voted on by participants (what people explicitly want)

Your job is to merge these signals to produce a comprehensive analysis.

For each priority, classify it as:
- **convergent**: Aligns with topics discussed in transcripts AND has strong votes — clear community consensus
- **blind_spot**: Appears in transcripts but was NOT submitted as a priority — important but overlooked
- **aspirational**: Submitted as a priority but NOT reflected in transcripts — forward-looking goals

Return a JSON object with these fields:
{
  "synthesis": "A 2-4 paragraph narrative summary of the deliberation findings, key themes, and actionable insights",
  "classifiedPriorities": [
    {
      "priorityId": "the exact priority ID from the list below",
      "title": "priority title",
      "classification": "convergent" | "blind_spot" | "aspirational",
      "reasoning": "1-2 sentence explanation of classification",
      "voteCount": number,
      "relatedTopicLabels": ["matching topic cluster labels"]
    }
  ],
  "blockerThemes": [
    {
      "theme": "theme name",
      "description": "description of the systemic blocker pattern",
      "affectedPriorities": ["priority titles affected"],
      "frequency": number of times this theme appears
    }
  ],
  "resourceRecommendations": [
    {
      "category": "funding" | "talent" | "tooling" | "other",
      "recommendation": "specific actionable recommendation",
      "relatedPriorities": ["priority titles this helps"],
      "urgency": "high" | "medium" | "low"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.
Use the exact priority IDs provided below.`;

    const userPrompt = `## Topic Clusters (from transcripts)
${topicContext || "(No topic clusters available)"}

## Community Priorities (voted on by participants)
${priorityContext}

## Priority ID Reference
${priorityIds}

Analyze the signals above and produce the merged analysis.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    });

    const responseText = response.choices[0]?.message?.content ?? "";

    return this.parseAndValidate(responseText, priorityList);
  }

  private parseAndValidate(
    responseText: string,
    priorityList: { id: string; title: string }[],
  ): Omit<AnalysisResult, "statistics" | "generatedAt"> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = /\{[\s\S]*\}/.exec(responseText);
      if (!match) {
        throw new Error(
          "Failed to parse deliberation analysis response as JSON",
        );
      }
      parsed = JSON.parse(match[0]);
    }

    const raw = parsed as RawAnalysisResponse;
    const validPriorityIds = new Set(priorityList.map((p) => p.id));

    // Validate synthesis
    const synthesis =
      typeof raw.synthesis === "string"
        ? raw.synthesis.trim()
        : "Analysis could not generate a synthesis.";

    // Validate classified priorities
    const classifiedPriorities: ClassifiedPriority[] = [];
    if (Array.isArray(raw.classifiedPriorities)) {
      for (const cp of raw.classifiedPriorities as Record<string, unknown>[]) {
        const priorityId =
          typeof cp.priorityId === "string" ? cp.priorityId : "";
        if (!validPriorityIds.has(priorityId)) continue;

        const classification =
          typeof cp.classification === "string" ? cp.classification : "";
        if (
          classification !== "convergent" &&
          classification !== "blind_spot" &&
          classification !== "aspirational"
        ) {
          continue;
        }

        classifiedPriorities.push({
          priorityId,
          title: typeof cp.title === "string" ? cp.title : "",
          classification,
          reasoning: typeof cp.reasoning === "string" ? cp.reasoning : "",
          voteCount:
            typeof cp.voteCount === "number" ? Math.max(0, cp.voteCount) : 0,
          relatedTopicLabels: Array.isArray(cp.relatedTopicLabels)
            ? (cp.relatedTopicLabels as unknown[])
                .filter((l): l is string => typeof l === "string")
                .slice(0, 5)
            : [],
        });
      }
    }

    // Validate blocker themes
    const blockerThemes: BlockerTheme[] = [];
    if (Array.isArray(raw.blockerThemes)) {
      for (const bt of (raw.blockerThemes as Record<string, unknown>[]).slice(
        0,
        10,
      )) {
        const theme = (typeof bt.theme === "string" ? bt.theme : "").trim();
        if (!theme) continue;

        blockerThemes.push({
          theme,
          description: typeof bt.description === "string" ? bt.description : "",
          affectedPriorities: Array.isArray(bt.affectedPriorities)
            ? (bt.affectedPriorities as unknown[])
                .filter((p): p is string => typeof p === "string")
                .slice(0, 10)
            : [],
          frequency:
            typeof bt.frequency === "number"
              ? Math.max(0, Math.round(bt.frequency))
              : 1,
        });
      }
    }

    // Validate resource recommendations
    const resourceRecommendations: ResourceRecommendation[] = [];
    if (Array.isArray(raw.resourceRecommendations)) {
      for (const rr of (
        raw.resourceRecommendations as Record<string, unknown>[]
      ).slice(0, 10)) {
        const category = typeof rr.category === "string" ? rr.category : "";
        if (!["funding", "talent", "tooling", "other"].includes(category)) {
          continue;
        }

        const urgency = typeof rr.urgency === "string" ? rr.urgency : "medium";
        const validUrgency = ["high", "medium", "low"].includes(urgency)
          ? (urgency as "high" | "medium" | "low")
          : "medium";

        resourceRecommendations.push({
          category: category as "funding" | "talent" | "tooling" | "other",
          recommendation:
            typeof rr.recommendation === "string" ? rr.recommendation : "",
          relatedPriorities: Array.isArray(rr.relatedPriorities)
            ? (rr.relatedPriorities as unknown[])
                .filter((p): p is string => typeof p === "string")
                .slice(0, 10)
            : [],
          urgency: validUrgency,
        });
      }
    }

    return {
      synthesis,
      classifiedPriorities,
      blockerThemes,
      resourceRecommendations,
    };
  }
}

export function getDeliberationAnalysisService(): DeliberationAnalysisService {
  return new DeliberationAnalysisService();
}
