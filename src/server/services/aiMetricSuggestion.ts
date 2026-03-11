import OpenAI from "openai";
import { type MetricType, type CollectionMethod } from "@prisma/client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface ProjectContext {
  projectId: string;
  title: string;
  description: string | null;
  technologies: string[];
  updates: {
    title: string;
    content: string;
    weekNumber: number | null;
    createdAt: Date;
  }[];
}

export interface AvailableMetric {
  id: string;
  name: string;
  description: string | null;
  metricType: MetricType[];
  unitOfMetric: string | null;
  category: string | null;
  collectionMethod: CollectionMethod;
}

export interface ExistingMetricSuggestion {
  metricId: string;
  metricName: string;
  metricDescription: string;
  relevanceScore: number; // 1-10 scale
  reasoning: string;
  matchedKeywords: string[];
}

export interface CustomMetricSuggestion {
  name: string;
  description: string;
  metricType: MetricType[];
  unitOfMetric: string;
  collectionMethod: CollectionMethod;
  reasoning: string;
  estimatedEffort: "low" | "medium" | "high";
  recommendedCadence?: string;
}

export interface MetricSuggestionResponse {
  existingMetrics: ExistingMetricSuggestion[];
  customMetrics: CustomMetricSuggestion[];
  confidence: number; // 0-1 scale
  analysisContext: {
    projectType: string;
    primaryFocus: string[];
    suggestedCategories: string[];
  };
}

interface AIResponse {
  existingMetrics: Array<{
    metricId: string;
    relevanceScore: number;
    reasoning: string;
    matchedKeywords: string[];
  }>;
  customMetrics: Array<{
    name: string;
    description: string;
    metricType: MetricType[];
    unitOfMetric: string;
    collectionMethod: CollectionMethod;
    reasoning: string;
    estimatedEffort: "low" | "medium" | "high";
    recommendedCadence?: string;
  }>;
  confidence?: number;
  analysisContext?: {
    projectType: string;
    primaryFocus: string[];
    suggestedCategories: string[];
  };
}

// ============================================================================
// AI Metric Suggestion Service
// ============================================================================

export class AIMetricSuggestionService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    // Comprehensive logging for debugging
    console.log("🔑 OpenAI API Key Status for Metric Suggestions:", {
      hasKey: !!apiKey,
      keyLength: apiKey?.length ?? 0,
      keyPrefix: apiKey?.substring(0, 7) ?? "none",
      timestamp: new Date().toISOString(),
    });

    if (!apiKey) {
      console.error("❌ OpenAI API key is missing for metric suggestions");
      throw new Error("OpenAI API key is required for metric suggestions");
    }

    this.openai = new OpenAI({ apiKey });
    console.log("✅ AIMetricSuggestionService initialized successfully");
  }

  /**
   * Generate metric suggestions for a project
   */
  async suggestMetrics(
    projectContext: ProjectContext,
    availableMetrics: AvailableMetric[],
    alreadyAddedMetricIds: string[],
  ): Promise<MetricSuggestionResponse> {
    const requestId = `suggest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🎯 [${requestId}] Starting metric suggestion for project:`, {
      projectId: projectContext.projectId,
      projectTitle: projectContext.title,
      totalAvailableMetrics: availableMetrics.length,
      alreadyAddedCount: alreadyAddedMetricIds.length,
      updateCount: projectContext.updates.length,
    });

    try {
      // Build the prompt
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildUserPrompt(
        projectContext,
        availableMetrics,
        alreadyAddedMetricIds,
      );

      console.log(`📝 [${requestId}] Prompt prepared, calling OpenAI...`);
      const startTime = Date.now();

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower for more consistent results
        max_tokens: 4000,
      });

      const duration = Date.now() - startTime;
      console.log(`⏱️ [${requestId}] OpenAI response received in ${duration}ms`);

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      // Clean markdown formatting if present
      let cleanContent = responseContent.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      // Parse JSON response
      const aiResponse = JSON.parse(cleanContent) as AIResponse;

      console.log(`🔍 [${requestId}] Parsed AI response:`, {
        existingMetricsCount: aiResponse.existingMetrics?.length ?? 0,
        customMetricsCount: aiResponse.customMetrics?.length ?? 0,
        confidence: aiResponse.confidence,
      });

      // Validate and transform response
      const result = this.validateAndTransformResponse(
        aiResponse,
        availableMetrics,
        requestId,
      );

      console.log(`✅ [${requestId}] Metric suggestion completed successfully`);
      return result;
    } catch (error) {
      console.error(`💥 [${requestId}] Metric suggestion error:`, error);

      if (error instanceof Error) {
        throw new Error(`AI metric suggestion failed: ${error.message}`);
      }
      throw new Error("AI metric suggestion failed with unknown error");
    }
  }

  /**
   * System prompt for the AI
   */
  private getSystemPrompt(): string {
    return `You are an expert in impact metrics and measurement for technology projects, particularly in the blockchain, web3, and public goods funding space.

Your role is to:
1. Analyze project context (name, description, tech stack, updates)
2. Suggest existing metrics from the metrics garden that are relevant
3. Recommend new custom metrics when there are gaps in existing metrics

Guidelines:
- Prioritize metrics that measure real impact, not vanity metrics
- Consider the project's stage (early vs mature)
- Balance leading indicators (inputs/activities) with lagging indicators (outcomes/impact)
- For blockchain projects, prioritize on-chain metrics when possible
- For developer tools, focus on adoption and usage metrics
- For community projects, focus on engagement and growth metrics

Return ONLY a valid JSON object with no markdown formatting or additional text.`;
  }

  /**
   * Build the user prompt with project context
   */
  private buildUserPrompt(
    project: ProjectContext,
    availableMetrics: AvailableMetric[],
    alreadyAddedMetricIds: string[],
  ): string {
    // Get last 10 updates for context
    const recentUpdates = project.updates
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    // Filter out already added metrics
    const suggestableMetrics = availableMetrics.filter(
      (m) => !alreadyAddedMetricIds.includes(m.id),
    );

    return `# Project Analysis

## Project Details
- **Name**: ${project.title}
- **Description**: ${project.description ?? "Not provided"}
- **Technologies**: ${project.technologies.length > 0 ? project.technologies.join(", ") : "Not specified"}

## Recent Project Updates (${recentUpdates.length} updates)
${recentUpdates.length > 0 ? recentUpdates.map((u) => `### Week ${u.weekNumber ?? "N/A"}: ${u.title}\n${u.content.substring(0, 300)}${u.content.length > 300 ? "..." : ""}`).join("\n\n") : "No updates available yet"}

## Available Metrics (${suggestableMetrics.length} metrics available)
${suggestableMetrics
  .slice(0, 50)
  .map(
    (m) => `- **${m.name}** (ID: ${m.id})
  Description: ${m.description ?? "No description"}
  Type: ${m.metricType.join(", ")}
  Collection: ${m.collectionMethod}
  Unit: ${m.unitOfMetric ?? "N/A"}`,
  )
  .join("\n\n")}

${suggestableMetrics.length > 50 ? `\n... and ${suggestableMetrics.length - 50} more metrics` : ""}

## Your Task
Based on the project context above:
1. Suggest 3-5 most relevant existing metrics from the available metrics list
2. Recommend 2-4 custom metrics that would be valuable but don't exist yet
3. Provide relevance scores (1-10) and reasoning for each suggestion
4. Match keywords that connect the project to each metric

## Required Response Format
Return ONLY valid JSON (no markdown formatting):

{
  "existingMetrics": [
    {
      "metricId": "exact-metric-id-from-list",
      "relevanceScore": 8,
      "reasoning": "Why this metric is relevant to this specific project...",
      "matchedKeywords": ["keyword1", "keyword2"]
    }
  ],
  "customMetrics": [
    {
      "name": "Custom Metric Name",
      "description": "What this metric measures and why it matters...",
      "metricType": ["BUILDER"],
      "unitOfMetric": "count",
      "collectionMethod": "SELF_REPORTING",
      "reasoning": "Why this custom metric is needed for this project...",
      "estimatedEffort": "low",
      "recommendedCadence": "weekly"
    }
  ],
  "confidence": 0.85,
  "analysisContext": {
    "projectType": "Blockchain Infrastructure",
    "primaryFocus": ["Developer Tools", "Smart Contracts"],
    "suggestedCategories": ["Technical", "Adoption"]
  }
}

Valid metricType values: BUILDER, ENVIRONMENTAL, GIT, ONCHAIN, OFFCHAIN, CUSTOM
Valid collectionMethod values: ONCHAIN, OFFCHAIN_API, SELF_REPORTING, MANUAL, AUTOMATED
Valid estimatedEffort values: low, medium, high`;
  }

  /**
   * Validate and transform AI response
   */
  private validateAndTransformResponse(
    aiResponse: AIResponse,
    availableMetrics: AvailableMetric[],
    requestId: string,
  ): MetricSuggestionResponse {
    console.log(`🔍 [${requestId}] Starting response validation...`);

    // Create metric lookup map
    const metricMap = new Map(availableMetrics.map((m) => [m.id, m]));

    // Validate existing metric suggestions
    const validatedExisting: ExistingMetricSuggestion[] = [];
    for (const suggestion of aiResponse.existingMetrics ?? []) {
      const metric = metricMap.get(suggestion.metricId);
      if (metric) {
        validatedExisting.push({
          metricId: suggestion.metricId,
          metricName: metric.name,
          metricDescription: metric.description ?? "",
          relevanceScore: Math.min(10, Math.max(1, suggestion.relevanceScore)),
          reasoning: suggestion.reasoning,
          matchedKeywords: suggestion.matchedKeywords ?? [],
        });
      } else {
        console.warn(
          `⚠️ [${requestId}] Suggested metric ID not found: ${suggestion.metricId}`,
        );
      }
    }

    // Validate custom metric suggestions
    const validatedCustom: CustomMetricSuggestion[] = [];
    for (const suggestion of aiResponse.customMetrics ?? []) {
      if (suggestion.name && suggestion.description && suggestion.metricType) {
        validatedCustom.push({
          name: suggestion.name,
          description: suggestion.description,
          metricType: suggestion.metricType,
          unitOfMetric: suggestion.unitOfMetric ?? "count",
          collectionMethod: suggestion.collectionMethod ?? "SELF_REPORTING",
          reasoning: suggestion.reasoning,
          estimatedEffort: suggestion.estimatedEffort ?? "medium",
          recommendedCadence: suggestion.recommendedCadence,
        });
      }
    }

    console.log(`✅ [${requestId}] Validation complete:`, {
      validExisting: validatedExisting.length,
      validCustom: validatedCustom.length,
    });

    return {
      existingMetrics: validatedExisting,
      customMetrics: validatedCustom,
      confidence: aiResponse.confidence ?? 0.7,
      analysisContext: aiResponse.analysisContext ?? {
        projectType: "Unknown",
        primaryFocus: [],
        suggestedCategories: [],
      },
    };
  }
}

// ============================================================================
// Service Factory
// ============================================================================

export function getAIMetricSuggestionService(): AIMetricSuggestionService {
  return new AIMetricSuggestionService();
}
