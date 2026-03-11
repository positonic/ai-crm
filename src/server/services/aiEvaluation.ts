import OpenAI from "openai";

// Types for AI evaluation
export interface ConfidenceFactors {
  dataCompleteness: number; // 0-100
  consistencyScore: number; // 0-100
  specificityLevel: number; // 0-100
  externalValidation: number; // 0-100
  overallConfidence: number; // Weighted average
}

export interface CriteriaScore {
  criteriaId: string;
  score: number; // 1-10
  reasoning: string;
  confidence: number; // 1-5
  dataQuality: "excellent" | "good" | "limited" | "insufficient";
}

export interface EntrepreneurialAssessment {
  score: number; // 1-10
  reasoning: string;
  keyStrengths: string[];
  developmentAreas: string[];
}

export interface AutoScoreResponse {
  scores: CriteriaScore[];
  overallComments: string;
  recommendation: "ACCEPT" | "REJECT" | "WAITLIST" | "NEEDS_MORE_INFO";
  confidence: number; // 1-5
  confidenceFactors: ConfidenceFactors;
  entrepreneurialAssessment: EntrepreneurialAssessment;
}

interface RawAIResponse {
  scores: unknown[];
  overallComments: string;
  recommendation: string;
  confidence?: number;
  confidenceFactors?: {
    dataCompleteness?: number;
    consistencyScore?: number;
    specificityLevel?: number;
    externalValidation?: number;
  };
  entrepreneurialAssessment?: {
    score?: number;
    reasoning?: string;
    keyStrengths?: unknown;
    developmentAreas?: unknown;
  };
}
export interface ApplicationData {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  event: {
    name: string;
  } | null;
  responses: Array<{
    answer: string;
    question: {
      questionKey: string;
      questionEn: string;
      order: number;
    };
  }>;
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  category: string;
  weight: number;
  order: number;
}

export interface EvaluationInput {
  application: ApplicationData;
  criteria: EvaluationCriteria[];
  stage: string;
}

export class AIEvaluationService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    console.log("🔑 OpenAI API Key Status:", {
      hasKey: !!apiKey,
      keyLength: apiKey?.length ?? 0,
      keyPrefix: apiKey ? apiKey.slice(0, 8) + "..." : "undefined",
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });

    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY environment variable is missing");
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    try {
      this.openai = new OpenAI({
        apiKey,
      });
      console.log("✅ OpenAI client initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize OpenAI client:", error);
      throw new Error(
        `OpenAI client initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async evaluateApplication(
    input: EvaluationInput,
  ): Promise<AutoScoreResponse> {
    const { application, criteria, stage } = input;

    // Generate unique request ID for tracking
    const requestId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🎯 [${requestId}] Starting AI Evaluation:`, {
      requestId,
      applicationId: application.id,
      userId: application.user?.id,
      stage,
      criteriaCount: criteria.length,
      responsesCount: application.responses.length,
      hasUser: !!application.user,
      userName: application.user?.name,
      userEmail: application.user?.email,
      timestamp: new Date().toISOString(),
    });

    // Detailed criteria logging
    console.log(
      `📋 [${requestId}] Evaluation Criteria:`,
      criteria.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        weight: c.weight,
        order: c.order,
      })),
    );

    // Log sample of application responses for debugging
    console.log(
      `📝 [${requestId}] Application Responses Sample:`,
      application.responses.slice(0, 3).map((r) => ({
        questionKey: r.question.questionKey,
        questionText: r.question.questionEn?.slice(0, 100) + "...",
        responseLength: r.answer?.length ?? 0,
        hasResponse: !!r.answer,
        answerPreview: r.answer?.slice(0, 50) + "...",
      })),
    );

    // Build structured prompt
    const prompt = this.buildEvaluationPrompt(application, criteria, stage);

    // Log prompt length and sample for debugging
    console.log(`📄 [${requestId}] AI Prompt Stats:`, {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 500) + "...",
      criteriaInPrompt: criteria.length,
      expectedScoreCount: criteria.length,
    });

    try {
      const startTime = Date.now();

      console.log(`🤖 [${requestId}] Sending request to OpenAI GPT-4o...`);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // Using GPT-4 Omni for better reasoning
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent evaluation
        max_tokens: 4000,
      });

      const requestTime = Date.now() - startTime;

      console.log(`⏱️ [${requestId}] OpenAI request completed:`, {
        requestTimeMs: requestTime,
        finishReason: completion.choices[0]?.finish_reason,
        hasResponse: !!completion.choices[0]?.message?.content,
        usage: completion.usage,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        console.error(`❌ [${requestId}] No response content from OpenAI`);
        throw new Error("No response from AI service");
      }

      // Enhanced AI response logging
      console.log(`🔍 [${requestId}] AI Raw Response Analysis:`, {
        length: responseContent.length,
        preview: responseContent.slice(0, 300) + "...",
        hasCodeBlocks: responseContent.includes("```"),
        startsWithJson: responseContent.trim().startsWith("{"),
        endsWithBrace: responseContent.trim().endsWith("}"),
        containsScores: responseContent.includes("scores"),
        containsRecommendation: responseContent.includes("recommendation"),
        containsConfidence: responseContent.includes("confidence"),
      });

      // Clean and parse the JSON response with enhanced error handling
      let cleanContent = responseContent.trim();
      const originalContent = cleanContent;

      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
        console.log(`🧹 [${requestId}] Removed JSON markdown blocks`);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
        console.log(`🧹 [${requestId}] Removed generic markdown blocks`);
      }

      console.log(`🔧 [${requestId}] Cleaned Content Analysis:`, {
        originalLength: originalContent.length,
        cleanedLength: cleanContent.length,
        preview: cleanContent.slice(0, 300) + "...",
        startsWithBrace: cleanContent.startsWith("{"),
        endsWithBrace: cleanContent.endsWith("}"),
      });

      let aiResponse: unknown;

      try {
        aiResponse = JSON.parse(cleanContent);
        console.log(`✅ [${requestId}] JSON parsing successful`);
      } catch (parseError) {
        console.error(`❌ [${requestId}] JSON parsing failed:`, {
          error:
            parseError instanceof Error ? parseError.message : "Unknown error",
          contentSample: cleanContent.slice(0, 200),
          contentLength: cleanContent.length,
          parseErrorType:
            parseError instanceof Error
              ? parseError.constructor.name
              : "Unknown",
        });
        throw new Error(
          `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        );
      }

      console.log(`🔍 [${requestId}] Parsed AI Response Structure:`, {
        isValid: this.isValidAIResponse(aiResponse),
        hasScores: !!(aiResponse as RawAIResponse)?.scores,
        scoresLength: Array.isArray((aiResponse as RawAIResponse)?.scores)
          ? (aiResponse as RawAIResponse).scores.length
          : 0,
        hasOverallComments: !!(aiResponse as RawAIResponse)?.overallComments,
        hasRecommendation: !!(aiResponse as RawAIResponse)?.recommendation,
        hasConfidence: !!(aiResponse as RawAIResponse)?.confidence,
        recommendation: (aiResponse as RawAIResponse)?.recommendation,
        confidence: (aiResponse as RawAIResponse)?.confidence,
      });

      const result = this.validateAndTransformResponse(
        aiResponse,
        criteria,
        requestId,
      );

      console.log(`🎯 [${requestId}] Final AutoScore Result:`, {
        scoresCount: result.scores.length,
        expectedScoresCount: criteria.length,
        overallCommentsLength: result.overallComments.length,
        recommendation: result.recommendation,
        confidence: result.confidence,
        entrepreneurialScore: result.entrepreneurialAssessment.score,
        requestCompletedInMs: Date.now() - (startTime - requestTime),
      });

      return result;
    } catch (error) {
      console.error(`💥 [${requestId}] AI Evaluation Error:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
        stack: error instanceof Error ? error.stack : undefined,
        applicationId: application.id,
        criteriaCount: criteria.length,
      });
      throw new Error(
        `AI evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert evaluator for the Funding the Commons Residency program, a prestigious 12-week technology residency focused on public goods funding, RealFi (Real World Finance), and crypto/blockchain innovations.

Your role is to assess applicants based on their:
1. Technical capabilities and experience
2. Project vision and feasibility  
3. Community fit and values alignment
4. Communication and presentation skills
5. **Entrepreneurial potential and business mindset**

Key evaluation principles:
- Focus on entrepreneur material: leadership, execution track record, business acumen
- Assess evidence quality: concrete examples vs vague claims
- Look for consistency across different responses
- Consider social proof and external validation (GitHub, LinkedIn, Twitter)
- Evaluate potential for innovation and calculated risk-taking
- Prioritize authentic passion over scripted responses

You must return ONLY a valid JSON object with the exact structure specified in the user prompt. Do not include any markdown formatting, code blocks, or additional text - just the raw JSON.`;
  }

  private buildEvaluationPrompt(
    application: ApplicationData,
    criteria: EvaluationCriteria[],
    stage: string,
  ): string {
    // Extract responses into a readable format
    const responses = application.responses.reduce(
      (acc, response) => {
        acc[response.question.questionKey] = response.answer;
        return acc;
      },
      {} as Record<string, string>,
    );

    return `
# Application Evaluation Request

## Applicant Information
- **Name**: ${application.user?.name ?? "Not provided"}
- **Email**: ${application.user?.email ?? "Not provided"}
- **Program**: ${application.event?.name ?? "Unknown"}
- **Stage**: ${stage}

## Application Responses
${Object.entries(responses)
  .map(
    ([key, answer]) => `
### ${key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
${answer ?? "Not provided"}
`,
  )
  .join("\n")}

## Evaluation Criteria
${criteria
  .map(
    (c, index) => `
**${index + 1}. ${c.name}** (ID: ${c.id})
- Category: ${c.category}
- Weight: ${(c.weight * 100).toFixed(1)}%
- Description: ${c.description}
`,
  )
  .join("\n")}

## Required Response Format

You must respond with ONLY the raw JSON object matching this exact structure (no markdown, no code blocks, no additional text):

IMPORTANT: Use the exact criteria IDs shown above (e.g., "${criteria[0]?.id ?? "example-id"}") in the criteriaId field.

{
  "scores": [
${criteria
  .map(
    (c) => `    {
      "criteriaId": "${c.id}",
      "score": 7,
      "reasoning": "Detailed reasoning for the score based on evidence from application",
      "confidence": 4,
      "dataQuality": "good"
    }`,
  )
  .join(",\n")}
  ],
  "overallComments": "Comprehensive evaluation summary highlighting key strengths and concerns",
  "recommendation": "ACCEPT",
  "confidence": 4,
  "confidenceFactors": {
    "dataCompleteness": 85,
    "consistencyScore": 90,
    "specificityLevel": 75,
    "externalValidation": 70,
    "overallConfidence": 80
  },
  "entrepreneurialAssessment": {
    "score": 8,
    "reasoning": "Assessment of entrepreneurial potential based on leadership, execution, business acumen",
    "keyStrengths": ["Leadership experience", "Track record of execution"],
    "developmentAreas": ["Market analysis", "Risk assessment"]
  }
}

## Criteria ID Reference (USE THESE EXACT IDs):
${criteria.map((c, index) => `${index + 1}. "${c.id}" - ${c.name}`).join("\n")}

## Scoring Guidelines

**Score Range**: 1-10 for each criterion
- 1-3: Poor/Concerning - Significant gaps or red flags
- 4-5: Below Average - Meets minimum requirements but has limitations  
- 6-7: Good - Solid candidate with good potential
- 8-9: Excellent - Strong candidate who exceeds expectations
- 10: Outstanding - Exceptional candidate, top 5% of applicants

**Confidence Levels**: 1-5
- 1: Very Low - Insufficient data to make reliable assessment
- 2: Low - Limited data, high uncertainty
- 3: Medium - Adequate data for basic assessment
- 4: High - Good data quality, confident in assessment
- 5: Very High - Excellent data, very confident in assessment

**Data Quality Assessment**:
- excellent: Rich details, specific examples, strong evidence
- good: Adequate details, some examples, reasonable evidence  
- limited: Basic information, few examples, weak evidence
- insufficient: Minimal information, no examples, no evidence

**Recommendation Guidelines**:
- ACCEPT: Strong fit, likely to succeed and contribute significantly
- WAITLIST: Good potential but some concerns or missing information
- NEEDS_MORE_INFO: Promising but requires additional information/clarification
- REJECT: Poor fit, significant concerns, or insufficient qualifications

Evaluate thoroughly and provide specific, evidence-based reasoning for all scores and recommendations.
`;
  }

  private validateAndTransformResponse(
    aiResponse: unknown,
    criteria: EvaluationCriteria[],
    requestId: string,
  ): AutoScoreResponse {
    console.log(`🔍 [${requestId}] Starting response validation...`);

    // Type guard for AI response
    if (!this.isValidAIResponse(aiResponse)) {
      console.error(`❌ [${requestId}] Invalid AI response structure:`, {
        hasScores: !!(aiResponse as RawAIResponse)?.scores,
        isScoresArray: Array.isArray((aiResponse as RawAIResponse)?.scores),
        hasOverallComments:
          typeof (aiResponse as RawAIResponse)?.overallComments === "string",
        hasRecommendation:
          typeof (aiResponse as RawAIResponse)?.recommendation === "string",
        hasConfidence:
          typeof (aiResponse as RawAIResponse)?.confidence === "number",
        actualStructure: Object.keys(
          (aiResponse as Record<string, unknown>) ?? {},
        ),
      });
      throw new Error("Invalid AI response structure");
    }

    console.log(`✅ [${requestId}] AI response structure is valid`);

    // Log AI provided scores vs expected criteria
    const aiScores = (aiResponse as RawAIResponse).scores ?? [];
    const expectedCriteriaIds = criteria.map((c) => c.id);
    const providedCriteriaIds = aiScores
      .map((s: unknown) => (this.isScoreData(s) ? s.criteriaId : "unknown"))
      .filter((id) => id !== "unknown");

    console.log(`📊 [${requestId}] Criteria Matching Analysis:`, {
      expectedCount: expectedCriteriaIds.length,
      providedCount: providedCriteriaIds.length,
      expectedIds: expectedCriteriaIds,
      providedIds: providedCriteriaIds,
      missingIds: expectedCriteriaIds.filter(
        (id) => !providedCriteriaIds.includes(id),
      ),
      extraIds: providedCriteriaIds.filter(
        (id) => !expectedCriteriaIds.includes(id),
      ),
      perfectMatch:
        expectedCriteriaIds.length === providedCriteriaIds.length &&
        expectedCriteriaIds.every((id) => providedCriteriaIds.includes(id)),
    });

    // Validate each score with detailed logging
    const validatedScores: CriteriaScore[] = [];
    for (const criterion of criteria) {
      const scoreData = aiResponse.scores.find(
        (s: unknown) => this.isScoreData(s) && s.criteriaId === criterion.id,
      );

      if (!scoreData) {
        console.warn(
          `⚠️ [${requestId}] Missing score for criterion: ${criterion.id} (${criterion.name}), using fallback`,
        );
        // If AI didn't provide a score for this criterion, create a default one
        validatedScores.push({
          criteriaId: criterion.id,
          score: 5, // Default middle score
          reasoning: "Insufficient information provided for evaluation",
          confidence: 1,
          dataQuality: "insufficient",
        });
      } else {
        console.log(
          `✅ [${requestId}] Found score for criterion: ${criterion.id} (${criterion.name})`,
        );
        // Validate the score data
        const scoreDataRecord = scoreData as Record<string, unknown>;
        const rawScore = this.getNumericValue(scoreDataRecord.score, 5);
        const clampedScore = Math.max(1, Math.min(10, Math.round(rawScore)));
        const rawConfidence = this.getNumericValue(
          scoreDataRecord.confidence,
          3,
        );
        const clampedConfidence = Math.max(
          1,
          Math.min(5, Math.round(rawConfidence)),
        );

        console.log(
          `📈 [${requestId}] Score validation for ${criterion.name}:`,
          {
            criteriaId: criterion.id,
            rawScore,
            clampedScore,
            scoreWasClamped: rawScore !== clampedScore,
            rawConfidence,
            clampedConfidence,
            confidenceWasClamped: rawConfidence !== clampedConfidence,
            reasoning: scoreDataRecord.reasoning ? "provided" : "fallback",
            dataQuality: scoreDataRecord.dataQuality ?? "limited",
          },
        );

        validatedScores.push({
          criteriaId: criterion.id,
          score: clampedScore,
          reasoning: this.getStringValue(
            scoreDataRecord.reasoning,
            "No reasoning provided",
          ),
          confidence: clampedConfidence,
          dataQuality: this.isValidDataQuality(scoreDataRecord.dataQuality)
            ? scoreDataRecord.dataQuality
            : "limited",
        });
      }
    }

    console.log(`📊 [${requestId}] Scores validation summary:`, {
      totalScores: validatedScores.length,
      fallbackScores: validatedScores.filter(
        (s) =>
          s.score === 5 &&
          s.reasoning === "Insufficient information provided for evaluation",
      ).length,
      averageScore:
        validatedScores.reduce((sum, s) => sum + s.score, 0) /
        validatedScores.length,
      scoreDistribution: validatedScores.reduce(
        (dist, s) => {
          dist[s.score] = (dist[s.score] ?? 0) + 1;
          return dist;
        },
        {} as Record<number, number>,
      ),
    });

    // Calculate confidence factors if not provided or invalid
    const confidenceFactors: ConfidenceFactors = {
      dataCompleteness: Math.max(
        0,
        Math.min(100, aiResponse.confidenceFactors?.dataCompleteness ?? 50),
      ),
      consistencyScore: Math.max(
        0,
        Math.min(100, aiResponse.confidenceFactors?.consistencyScore ?? 50),
      ),
      specificityLevel: Math.max(
        0,
        Math.min(100, aiResponse.confidenceFactors?.specificityLevel ?? 50),
      ),
      externalValidation: Math.max(
        0,
        Math.min(100, aiResponse.confidenceFactors?.externalValidation ?? 50),
      ),
      overallConfidence: 0, // Will be calculated
    };

    // Calculate overall confidence as weighted average
    confidenceFactors.overallConfidence = Math.round(
      confidenceFactors.dataCompleteness * 0.4 +
        confidenceFactors.consistencyScore * 0.25 +
        confidenceFactors.specificityLevel * 0.2 +
        confidenceFactors.externalValidation * 0.15,
    );

    console.log(`🎯 [${requestId}] Confidence factors:`, confidenceFactors);

    // Validate entrepreneurial assessment
    const rawEntrepreneurialScore =
      aiResponse.entrepreneurialAssessment?.score ?? 5;
    const clampedEntrepreneurialScore = Math.max(
      1,
      Math.min(10, Math.round(rawEntrepreneurialScore)),
    );

    const entrepreneurialAssessment: EntrepreneurialAssessment = {
      score: clampedEntrepreneurialScore,
      reasoning:
        aiResponse.entrepreneurialAssessment?.reasoning ??
        "Basic entrepreneurial assessment completed",
      keyStrengths: Array.isArray(
        aiResponse.entrepreneurialAssessment?.keyStrengths,
      )
        ? (aiResponse.entrepreneurialAssessment.keyStrengths as string[]).slice(
            0,
            5,
          ) // Limit to 5 items
        : ["Assessment pending"],
      developmentAreas: Array.isArray(
        aiResponse.entrepreneurialAssessment?.developmentAreas,
      )
        ? (
            aiResponse.entrepreneurialAssessment.developmentAreas as string[]
          ).slice(0, 5) // Limit to 5 items
        : ["Further evaluation needed"],
    };

    console.log(`🚀 [${requestId}] Entrepreneurial assessment:`, {
      rawScore: rawEntrepreneurialScore,
      finalScore: clampedEntrepreneurialScore,
      scoreWasClamped: rawEntrepreneurialScore !== clampedEntrepreneurialScore,
      hasReasoning: !!aiResponse.entrepreneurialAssessment?.reasoning,
      strengthsCount: entrepreneurialAssessment.keyStrengths.length,
      developmentAreasCount: entrepreneurialAssessment.developmentAreas.length,
    });

    const finalResult = {
      scores: validatedScores,
      overallComments: aiResponse.overallComments,
      recommendation: aiResponse.recommendation as
        | "ACCEPT"
        | "REJECT"
        | "WAITLIST"
        | "NEEDS_MORE_INFO",
      confidence: Math.max(
        1,
        Math.min(5, Math.round(aiResponse.confidence ?? 3)),
      ),
      confidenceFactors,
      entrepreneurialAssessment,
    };

    console.log(`🏁 [${requestId}] Validation completed successfully:`, {
      finalScoresCount: finalResult.scores.length,
      recommendation: finalResult.recommendation,
      overallConfidence: finalResult.confidence,
      hasOverallComments: !!finalResult.overallComments,
      commentsLength: finalResult.overallComments.length,
    });

    return finalResult;
  }

  // Type guards for validation
  private isValidAIResponse(response: unknown): response is {
    scores: unknown[];
    overallComments: string;
    recommendation: string;
    confidence?: number;
    confidenceFactors?: {
      dataCompleteness?: number;
      consistencyScore?: number;
      specificityLevel?: number;
      externalValidation?: number;
    };
    entrepreneurialAssessment?: {
      score?: number;
      reasoning?: string;
      keyStrengths?: unknown;
      developmentAreas?: unknown;
    };
  } {
    // Enhanced validation with detailed failure logging
    if (typeof response !== "object" || response === null) {
      console.error(
        "🚨 AI Response Validation Failed: Not an object or is null",
        {
          type: typeof response,
          isNull: response === null,
          value: response,
        },
      );
      return false;
    }

    const responseObj = response as Record<string, unknown>;

    if (!("scores" in responseObj)) {
      console.error(
        '🚨 AI Response Validation Failed: Missing "scores" property',
        {
          availableKeys: Object.keys(responseObj),
        },
      );
      return false;
    }

    if (!Array.isArray(responseObj.scores)) {
      console.error(
        '🚨 AI Response Validation Failed: "scores" is not an array',
        {
          scoresType: typeof responseObj.scores,
          scoresValue: responseObj.scores,
        },
      );
      return false;
    }

    if (!("overallComments" in responseObj)) {
      console.error(
        '🚨 AI Response Validation Failed: Missing "overallComments" property',
        {
          availableKeys: Object.keys(responseObj),
        },
      );
      return false;
    }

    if (typeof responseObj.overallComments !== "string") {
      console.error(
        '🚨 AI Response Validation Failed: "overallComments" is not a string',
        {
          overallCommentsType: typeof responseObj.overallComments,
          overallCommentsValue: responseObj.overallComments,
        },
      );
      return false;
    }

    if (!("recommendation" in responseObj)) {
      console.error(
        '🚨 AI Response Validation Failed: Missing "recommendation" property',
        {
          availableKeys: Object.keys(responseObj),
        },
      );
      return false;
    }

    if (typeof responseObj.recommendation !== "string") {
      console.error(
        '🚨 AI Response Validation Failed: "recommendation" is not a string',
        {
          recommendationType: typeof responseObj.recommendation,
          recommendationValue: responseObj.recommendation,
        },
      );
      return false;
    }

    const validRecommendations = [
      "ACCEPT",
      "REJECT",
      "WAITLIST",
      "NEEDS_MORE_INFO",
    ];
    if (!validRecommendations.includes(responseObj.recommendation)) {
      console.error(
        "🚨 AI Response Validation Failed: Invalid recommendation value",
        {
          providedRecommendation: responseObj.recommendation,
          validOptions: validRecommendations,
        },
      );
      return false;
    }

    console.log("✅ AI Response passed all validation checks");
    return true;
  }

  private isScoreData(data: unknown): data is {
    criteriaId: string;
    score?: number;
    reasoning?: string;
    confidence?: number;
    dataQuality?: string;
  } {
    return (
      typeof data === "object" &&
      data !== null &&
      "criteriaId" in data &&
      typeof (data as Record<string, unknown>).criteriaId === "string"
    );
  }

  private getNumericValue(value: unknown, defaultValue: number): number {
    if (typeof value === "number") {
      if (isNaN(value) || !isFinite(value)) {
        console.warn("⚠️ Numeric value is NaN or infinite, using fallback:", {
          providedValue: value,
          defaultValue,
          isNaN: isNaN(value),
          isFinite: isFinite(value),
        });
        return defaultValue;
      }
      return value;
    }

    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        console.warn(
          "⚠️ String value could not be parsed as number, using fallback:",
          {
            providedValue: value,
            defaultValue,
            parseAttempt: parsed,
          },
        );
        return defaultValue;
      }
      return parsed;
    }

    console.warn("⚠️ Non-numeric value provided, using fallback:", {
      providedValue: value,
      providedType: typeof value,
      defaultValue,
    });
    return defaultValue;
  }

  private getStringValue(value: unknown, defaultValue: string): string {
    if (typeof value === "string") {
      if (value.trim() === "") {
        console.warn("⚠️ Empty string provided, using fallback:", {
          providedValue: value,
          defaultValue,
        });
        return defaultValue;
      }
      return value;
    }

    console.warn("⚠️ Non-string value provided, using fallback:", {
      providedValue: value,
      providedType: typeof value,
      defaultValue,
    });
    return defaultValue;
  }

  private isValidDataQuality(
    quality: unknown,
  ): quality is "excellent" | "good" | "limited" | "insufficient" {
    return (
      typeof quality === "string" &&
      ["excellent", "good", "limited", "insufficient"].includes(quality)
    );
  }
}

// Export service instance getter
export function getAIEvaluationService(): AIEvaluationService {
  return new AIEvaluationService();
}
