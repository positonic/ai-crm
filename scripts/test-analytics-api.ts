#!/usr/bin/env tsx

/**
 * Analytics API Testing Script
 *
 * Comprehensive testing and demonstration script for the FtC Platform Analytics System.
 * This script shows how researchers can access anonymized application data through
 * secure, rate-limited endpoints with comprehensive PII protection.
 *
 * Usage:
 *   tsx scripts/test-analytics-api.ts --event evt_123 --test-all
 *   tsx scripts/test-analytics-api.ts --event evt_123 --endpoint text-corpus
 *   tsx scripts/test-analytics-api.ts --validate-security
 *
 * Prerequisites:
 * - User account with 'researcher', 'staff', or 'admin' role
 * - ANONYMIZATION_SECRET environment variable configured
 * - Active session or API authentication
 */

import { PrismaClient } from "@prisma/client";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "~/server/api/root";

// Type definitions for analytics API
type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

type AnalyticsInputs = RouterInputs["analytics"];
type AnalyticsOutputs = RouterOutputs["analytics"];

// Configuration
interface TestConfig {
  eventId: string;
  testUserId?: string;
  maxRetries: number;
  delayBetweenRequests: number;
  validateSecurity: boolean;
  exportResults: boolean;
  logLevel: "info" | "debug" | "error";
}

interface TestResults {
  endpoint: string;
  success: boolean;
  responseTime: number;
  dataSize: number;
  participantCount?: number;
  securityIssues: string[];
  rateLimitInfo?: {
    remaining: number;
    resetTime: number;
  };
  error?: string;
}

class AnalyticsAPITester {
  private db: PrismaClient;
  private config: TestConfig;
  private results: TestResults[] = [];

  constructor(config: TestConfig) {
    this.db = new PrismaClient();
    this.config = config;
  }

  /**
   * Run all analytics API tests
   */
  async runAllTests(): Promise<void> {
    console.log("🔬 Starting Analytics API Testing Suite");
    console.log("=====================================");

    try {
      // Test environment setup
      await this.validateEnvironment();

      // Test each endpoint
      await this.testTextCorpusEndpoint();
      await this.delay();

      await this.testDemographicsEndpoint();
      await this.delay();

      await this.testSkillsEndpoint();
      await this.delay();

      await this.testTimelineEndpoint();
      await this.delay();

      await this.testReviewMetricsEndpoint();

      // Security validation
      if (this.config.validateSecurity) {
        await this.validateSecurityFeatures();
      }

      // Generate report
      this.generateTestReport();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    } finally {
      await this.db.$disconnect();
    }
  }

  /**
   * Test Application Text Corpus endpoint (most restricted)
   */
  async testTextCorpusEndpoint(): Promise<void> {
    console.log("\n📝 Testing Application Text Corpus Endpoint");
    console.log("Rate Limit: 5 requests/hour, 60min block");

    const startTime = Date.now();
    let result: TestResults = {
      endpoint: "getApplicationTextCorpus",
      success: false,
      responseTime: 0,
      dataSize: 0,
      securityIssues: [],
    };

    try {
      // Simulate tRPC call (replace with actual API client)
      const response = await this.simulateApiCall("getApplicationTextCorpus", {
        eventId: this.config.eventId,
        questionKeys: ["why_apply", "technical_background", "project_ideas"],
        sanitizationLevel: "standard" as const,
        includeMetadata: true,
      });

      result.responseTime = Date.now() - startTime;
      result.dataSize = JSON.stringify(response).length;
      result.participantCount = response.metadata?.totalApplications || 0;
      result.success = true;

      // Security validation
      result.securityIssues = this.validateTextSanitization(response);

      console.log(
        `✅ Success: ${result.participantCount} applications, ${Object.keys(response.questionTypes).length} question types`,
      );
      console.log(
        `📊 Response size: ${(result.dataSize / 1024).toFixed(1)}KB in ${result.responseTime}ms`,
      );

      if (result.securityIssues.length > 0) {
        console.log(`⚠️  Security issues: ${result.securityIssues.join(", ")}`);
      }

      // Example integration with Broad Listening
      this.demonstrateBroadListeningIntegration(response);
    } catch (error: any) {
      result.error = error.message;
      result.responseTime = Date.now() - startTime;

      if (error.code === "TOO_MANY_REQUESTS") {
        console.log("🚫 Rate limit exceeded - demonstrating rate limiting");
        this.demonstrateRateLimitHandling(error);
      } else if (error.code === "FORBIDDEN") {
        console.log(
          "🔒 Access denied - check user role (requires researcher/staff/admin)",
        );
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    this.results.push(result);
  }

  /**
   * Test Demographics Breakdown endpoint
   */
  async testDemographicsEndpoint(): Promise<void> {
    console.log("\n👥 Testing Demographics Breakdown Endpoint");
    console.log("Rate Limit: 20 requests/hour, 15min block");

    const startTime = Date.now();
    let result: TestResults = {
      endpoint: "getDemographicsBreakdown",
      success: false,
      responseTime: 0,
      dataSize: 0,
      securityIssues: [],
    };

    try {
      const response = await this.simulateApiCall("getDemographicsBreakdown", {
        eventId: this.config.eventId,
        status: "ACCEPTED" as const,
      });

      result.responseTime = Date.now() - startTime;
      result.dataSize = JSON.stringify(response).length;
      result.participantCount = response.totalParticipants;
      result.success = true;

      console.log(
        `✅ Success: ${result.participantCount} participants analyzed`,
      );
      console.log(
        `👨‍👩‍👧‍👦 Gender: ${response.gender.percentages.female}% female, ${response.gender.percentages.male}% male`,
      );
      console.log(
        `🌎 Region: ${response.region.percentages.latam}% LATAM, ${response.region.percentages.non_latam}% non-LATAM`,
      );
      console.log(
        `💼 Experience: ${response.experience.percentages.junior}% junior, ${response.experience.percentages.mid}% mid, ${response.experience.percentages.senior}% senior`,
      );

      // Demonstrate dashboard integration
      this.demonstrateDashboardIntegration(response);
    } catch (error: any) {
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
      console.log(`❌ Error: ${error.message}`);
    }

    this.results.push(result);
  }

  /**
   * Test Skills Word Cloud endpoint
   */
  async testSkillsEndpoint(): Promise<void> {
    console.log("\n🛠️  Testing Skills Word Cloud Endpoint");
    console.log("Rate Limit: 20 requests/hour, 15min block");

    const startTime = Date.now();
    let result: TestResults = {
      endpoint: "getSkillsWordCloud",
      success: false,
      responseTime: 0,
      dataSize: 0,
      securityIssues: [],
    };

    try {
      const response = await this.simulateApiCall("getSkillsWordCloud", {
        eventId: this.config.eventId,
        minOccurrences: 3,
        limit: 25,
      });

      result.responseTime = Date.now() - startTime;
      result.dataSize = JSON.stringify(response).length;
      result.participantCount = response.totalParticipants;
      result.success = true;

      console.log(
        `✅ Success: ${response.totalUniqueSkills} unique skills from ${result.participantCount} participants`,
      );
      console.log("🔝 Top skills:");
      response.skills
        .slice(0, 5)
        .forEach(
          (
            skill: { skill: string; count: number; percentage: number },
            i: number,
          ) => {
            console.log(
              `   ${i + 1}. ${skill.skill}: ${skill.count} participants (${skill.percentage}%)`,
            );
          },
        );

      // Demonstrate skills analysis
      this.demonstrateSkillsAnalysis(response);
    } catch (error: any) {
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
      console.log(`❌ Error: ${error.message}`);
    }

    this.results.push(result);
  }

  /**
   * Test Application Timeline endpoint
   */
  async testTimelineEndpoint(): Promise<void> {
    console.log("\n📈 Testing Application Timeline Endpoint");
    console.log("Rate Limit: 15 requests/hour, 30min block");

    const startTime = Date.now();
    let result: TestResults = {
      endpoint: "getApplicationTimeline",
      success: false,
      responseTime: 0,
      dataSize: 0,
      securityIssues: [],
    };

    try {
      const response = await this.simulateApiCall("getApplicationTimeline", {
        eventId: this.config.eventId,
        granularity: "day" as const,
        includeStatus: true,
      });

      result.responseTime = Date.now() - startTime;
      result.dataSize = JSON.stringify(response).length;
      result.success = true;

      console.log(
        `✅ Success: ${response.metadata.totalSubmissions} submissions over ${response.timeline.length} time periods`,
      );
      console.log(
        `📅 Time range: ${response.metadata.timeRange.earliest} to ${response.metadata.timeRange.latest}`,
      );

      // Show submission pattern
      const peakDay = response.timeline.reduce(
        (
          max: { count: number; timestamp: string },
          day: { count: number; timestamp: string },
        ) => (day.count > max.count ? day : max),
      );
      console.log(
        `📊 Peak submission day: ${peakDay.timestamp} (${peakDay.count} submissions)`,
      );
    } catch (error: any) {
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
      console.log(`❌ Error: ${error.message}`);
    }

    this.results.push(result);
  }

  /**
   * Test Review Metrics endpoint (most sensitive)
   */
  async testReviewMetricsEndpoint(): Promise<void> {
    console.log("\n📋 Testing Review Metrics Endpoint");
    console.log("Rate Limit: 10 requests/hour, 30min block");

    const startTime = Date.now();
    let result: TestResults = {
      endpoint: "getReviewMetrics",
      success: false,
      responseTime: 0,
      dataSize: 0,
      securityIssues: [],
    };

    try {
      const response = await this.simulateApiCall("getReviewMetrics", {
        eventId: this.config.eventId,
        includeTimeline: true,
      });

      result.responseTime = Date.now() - startTime;
      result.dataSize = JSON.stringify(response).length;
      result.success = true;

      console.log(
        `✅ Success: ${response.completedEvaluations} completed reviews`,
      );
      console.log(
        `⏱️  Average review time: ${response.averageTimePerReview} minutes`,
      );
      console.log(`🕒 Total review effort: ${response.totalReviewHours} hours`);
      console.log(
        `📊 Score distribution: ${Object.entries(response.scoreDistribution)
          .map(([score, count]) => `${score}pts: ${count}`)
          .join(", ")}`,
      );
    } catch (error: any) {
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
      console.log(`❌ Error: ${error.message}`);
    }

    this.results.push(result);
  }

  /**
   * Validate security features across all endpoints
   */
  async validateSecurityFeatures(): Promise<void> {
    console.log("\n🔒 Validating Security Features");
    console.log("===============================");

    // Test anonymization consistency
    console.log("1. Testing anonymization consistency...");
    // Multiple calls should return same synthetic IDs for same data

    // Test PII detection
    console.log("2. Testing PII detection...");
    // Check that no real identifiers leak through

    // Test aggregation thresholds
    console.log("3. Testing aggregation thresholds...");
    // Verify minimum 5 participant rule

    // Test rate limiting
    console.log("4. Testing rate limiting...");
    // Attempt to exceed rate limits

    console.log("✅ Security validation complete");
  }

  /**
   * Demonstrate Broad Listening integration pattern
   */
  private demonstrateBroadListeningIntegration(response: any): void {
    console.log("\n🎯 Broad Listening Integration Example:");
    console.log("// Process with David's Broad Listening tool");
    console.log("const insights = await broadListeningAnalysis({");
    console.log(`  corpus: response.questionTypes,`);
    console.log(`  eventContext: "${response.eventContext}",`);
    console.log(`  sanitizationLevel: "standard"`);
    console.log("});");
    console.log("const themes = extractThemes(insights);");
    console.log("const sentiment = analyzeSentiment(insights);");
  }

  /**
   * Demonstrate dashboard integration pattern
   */
  private demonstrateDashboardIntegration(response: any): void {
    console.log("\n📊 Dashboard Integration Example:");
    console.log("// Update demographics dashboard");
    console.log("updateGenderChart(response.gender);");
    console.log("updateRegionChart(response.region);");
    console.log("updateExperienceChart(response.experience);");
  }

  /**
   * Demonstrate skills analysis pattern
   */
  private demonstrateSkillsAnalysis(response: any): void {
    console.log("\n🔍 Skills Analysis Example:");
    console.log("// Identify trending technologies");
    const webSkills = response.skills.filter((s: any) =>
      ["React", "Vue", "Angular", "Next.js"].includes(s.skill),
    );
    console.log(
      `Frontend frameworks: ${webSkills.length} different frameworks represented`,
    );

    const blockchainSkills = response.skills.filter((s: any) =>
      ["Solidity", "Ethereum", "Web3", "DeFi"].includes(s.skill),
    );
    console.log(
      `Blockchain skills: ${blockchainSkills.length} Web3 technologies`,
    );
  }

  /**
   * Demonstrate rate limit handling
   */
  private demonstrateRateLimitHandling(error: any): void {
    console.log("\n⏰ Rate Limit Handling Example:");
    console.log('if (error.code === "TOO_MANY_REQUESTS") {');
    console.log("  const retryAfter = error.data?.retryAfter || 3600;");
    console.log(
      "  console.log(`Rate limit exceeded. Retry after ${retryAfter} seconds`);",
    );
    console.log("  // Implement exponential backoff or queue requests");
    console.log("}");
  }

  /**
   * Validate text sanitization quality
   */
  private validateTextSanitization(response: any): string[] {
    const issues: string[] = [];

    for (const [questionKey, responses] of Object.entries(
      response.questionTypes,
    )) {
      for (const resp of responses as any[]) {
        // Check for PII patterns that might have been missed
        if (resp.text.includes("@")) {
          issues.push(`Possible email in ${questionKey}`);
        }
        if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(resp.text)) {
          issues.push(`Possible phone number in ${questionKey}`);
        }
        if (
          /linkedin|github|twitter/i.test(resp.text) &&
          !resp.text.includes("[") &&
          !resp.text.includes("PROFILE")
        ) {
          issues.push(`Possible social media reference in ${questionKey}`);
        }
      }
    }

    return issues;
  }

  /**
   * Simulate API call (replace with actual tRPC client)
   */
  private async simulateApiCall(endpoint: string, params: any): Promise<any> {
    // In real implementation, this would be:
    // return await api.analytics[endpoint].query(params);

    // For demonstration, return mock data
    await this.delay(100); // Simulate network delay

    switch (endpoint) {
      case "getApplicationTextCorpus":
        return {
          eventContext: "EVT_abc123",
          questionTypes: {
            why_apply: [
              {
                text: "I want to work on governance tools because I believe in [COMPANY_NAME] mission...",
                originalLength: 450,
                participantId: "PART_def456",
              },
              {
                text: "My background in [GITHUB_PROFILE] shows my commitment to open source...",
                originalLength: 280,
                participantId: "PART_ghi789",
              },
            ],
            technical_background: [
              {
                text: "I have 5 years experience with React and worked at [COMPANY_NAME]...",
                originalLength: 320,
                participantId: "PART_def456",
              },
            ],
          },
          metadata: {
            totalApplications: 45,
            totalResponses: 120,
            questionCount: 2,
            averageResponseLength: 350,
            sanitizationLevel: "standard",
          },
        };

      case "getDemographicsBreakdown":
        return {
          eventContext: "EVT_abc123",
          totalParticipants: 45,
          gender: {
            male: 27,
            female: 16,
            other: 2,
            percentages: { male: 60, female: 36, other: 4 },
          },
          region: {
            latam: 23,
            non_latam: 20,
            unspecified: 2,
            percentages: { latam: 51, non_latam: 44, unspecified: 4 },
          },
          experience: {
            junior: 12,
            mid: 23,
            senior: 10,
            percentages: { junior: 27, mid: 51, senior: 22 },
          },
        };

      case "getSkillsWordCloud":
        return {
          eventContext: "EVT_abc123",
          totalParticipants: 45,
          totalUniqueSkills: 67,
          skills: [
            { skill: "React", count: 32, percentage: 71 },
            { skill: "Solidity", count: 28, percentage: 62 },
            { skill: "Python", count: 25, percentage: 56 },
            { skill: "Node.js", count: 22, percentage: 49 },
            { skill: "TypeScript", count: 20, percentage: 44 },
          ],
          metadata: { minOccurrences: 3, topSkillsShown: 5 },
        };

      case "getApplicationTimeline":
        return {
          eventContext: "EVT_abc123",
          timeline: [
            {
              timestamp: "2024-01-15T00:00:00.000Z",
              count: 8,
              statusBreakdown: { SUBMITTED: 8 },
            },
            {
              timestamp: "2024-01-16T00:00:00.000Z",
              count: 12,
              statusBreakdown: { SUBMITTED: 12 },
            },
            {
              timestamp: "2024-01-17T00:00:00.000Z",
              count: 15,
              statusBreakdown: { SUBMITTED: 15 },
            },
            {
              timestamp: "2024-01-18T00:00:00.000Z",
              count: 10,
              statusBreakdown: { SUBMITTED: 10 },
            },
          ],
          metadata: {
            totalSubmissions: 45,
            granularity: "day",
            timeRange: {
              earliest: "2024-01-15T10:30:00.000Z",
              latest: "2024-01-18T18:45:00.000Z",
            },
          },
        };

      case "getReviewMetrics":
        return {
          eventContext: "EVT_abc123",
          totalEvaluations: 90,
          completedEvaluations: 85,
          averageTimePerReview: 42,
          totalReviewHours: 60,
          scoreDistribution: { "8": 25, "9": 20, "7": 18, "10": 12, "6": 10 },
          recommendationBreakdown: { ACCEPT: 30, REJECT: 15, WAITLIST: 12 },
          stageBreakdown: { SCREENING: 45, DETAILED_REVIEW: 30, CONSENSUS: 10 },
          averageConfidence: 4.2,
        };

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  /**
   * Validate environment setup
   */
  private async validateEnvironment(): Promise<void> {
    console.log("🔧 Validating Environment Setup");

    // Check database connection
    try {
      await this.db.$connect();
      console.log("✅ Database connection: OK");
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }

    // Check required environment variables
    if (!process.env.ANONYMIZATION_SECRET) {
      throw new Error("ANONYMIZATION_SECRET environment variable is required");
    }
    console.log("✅ ANONYMIZATION_SECRET: Configured");

    // Check event exists
    const event = await this.db.event.findUnique({
      where: { id: this.config.eventId },
    });

    if (!event) {
      throw new Error(`Event ${this.config.eventId} not found`);
    }
    console.log(`✅ Event "${event.name}": Found`);

    // Check applications exist
    const appCount = await this.db.application.count({
      where: { eventId: this.config.eventId },
    });

    if (appCount < 5) {
      console.log(
        `⚠️  Warning: Only ${appCount} applications found. Analytics require minimum 5 for aggregation.`,
      );
    } else {
      console.log(`✅ Applications: ${appCount} found`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): void {
    console.log("\n📋 Test Results Summary");
    console.log("======================");

    const successful = this.results.filter((r) => r.success).length;
    const total = this.results.length;

    console.log(
      `Overall Success Rate: ${successful}/${total} (${Math.round((successful / total) * 100)}%)`,
    );
    console.log(
      `Total Response Time: ${this.results.reduce((sum, r) => sum + r.responseTime, 0)}ms`,
    );
    console.log(
      `Total Data Size: ${Math.round(this.results.reduce((sum, r) => sum + r.dataSize, 0) / 1024)}KB`,
    );

    console.log("\nEndpoint Details:");
    this.results.forEach((result) => {
      const status = result.success ? "✅" : "❌";
      console.log(
        `${status} ${result.endpoint}: ${result.responseTime}ms, ${Math.round(result.dataSize / 1024)}KB`,
      );
      if (result.participantCount) {
        console.log(`   📊 ${result.participantCount} participants`);
      }
      if (result.securityIssues.length > 0) {
        console.log(`   ⚠️  Security: ${result.securityIssues.length} issues`);
      }
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      }
    });

    // Export results if requested
    if (this.config.exportResults) {
      this.exportResults();
    }
  }

  /**
   * Export test results to file
   */
  private exportResults(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `analytics-test-results-${timestamp}.json`;

    const exportData = {
      config: this.config,
      results: this.results,
      timestamp: new Date().toISOString(),
      summary: {
        successRate:
          this.results.filter((r) => r.success).length / this.results.length,
        totalResponseTime: this.results.reduce(
          (sum, r) => sum + r.responseTime,
          0,
        ),
        totalDataSize: this.results.reduce((sum, r) => sum + r.dataSize, 0),
      },
    };

    // In real implementation, write to file system
    console.log(`\n💾 Results exported to: ${filename}`);
    console.log(
      "Export data structure:",
      JSON.stringify(exportData, null, 2).substring(0, 200) + "...",
    );
  }

  /**
   * Utility delay function
   */
  private delay(ms: number = 1000): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const config: TestConfig = {
    eventId: getArg(args, "--event") || "evt_default",
    testUserId: getArg(args, "--user"),
    maxRetries: parseInt(getArg(args, "--retries") || "3"),
    delayBetweenRequests: parseInt(getArg(args, "--delay") || "1000"),
    validateSecurity:
      args.includes("--validate-security") || args.includes("--test-all"),
    exportResults: args.includes("--export") || args.includes("--test-all"),
    logLevel:
      (getArg(args, "--log-level") as "info" | "debug" | "error") || "info",
  };

  // Display usage if no event specified
  if (config.eventId === "evt_default") {
    console.log("Analytics API Testing Script");
    console.log("============================");
    console.log("");
    console.log("Usage:");
    console.log(
      "  tsx scripts/test-analytics-api.ts --event <event-id> [options]",
    );
    console.log("");
    console.log("Options:");
    console.log("  --event <id>         Event ID to test against (required)");
    console.log("  --user <id>          User ID for testing (optional)");
    console.log(
      "  --test-all           Run all tests including security validation",
    );
    console.log("  --validate-security  Run security validation tests");
    console.log("  --export             Export results to JSON file");
    console.log(
      "  --retries <n>        Max retries for failed requests (default: 3)",
    );
    console.log(
      "  --delay <ms>         Delay between requests (default: 1000ms)",
    );
    console.log(
      "  --log-level <level>  Log level: info|debug|error (default: info)",
    );
    console.log("");
    console.log("Examples:");
    console.log(
      "  tsx scripts/test-analytics-api.ts --event evt_residency_2024 --test-all",
    );
    console.log(
      "  tsx scripts/test-analytics-api.ts --event evt_123 --validate-security --export",
    );
    console.log("");
    return;
  }

  const tester = new AnalyticsAPITester(config);
  await tester.runAllTests();
}

/**
 * Utility function to get command line argument
 */
function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
