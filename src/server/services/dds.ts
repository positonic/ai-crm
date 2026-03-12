import { AtpAgent } from "@atproto/api";
import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { env } from "~/env.js";
import * as Sentry from "@sentry/nextjs";
import { type AnalysisResult } from "./deliberationAnalysis";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateRecordResponse {
  uri: string;
  cid: string;
}

interface DeliberationData {
  id: string;
  title: string;
  description: string | null;
  eventName: string;
  eventId: string;
  analysisResult: AnalysisResult;
  topicClusters: {
    label: string;
    keywords: string[];
    mentionCount: number;
  }[];
}

export interface PublishDDSResult {
  summaryUri: string;
  summaryCid: string;
  pcaUri: string;
  pcaCid: string;
  activityUri: string;
  activityCid: string;
  boardUri: string;
  boardCid: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class DDSPublicationService {
  private db: PrismaClient;
  private pdsUrl: string;

  constructor(db: PrismaClient) {
    this.db = db;
    this.pdsUrl = env.ATPROTO_PDS_URL ?? "https://bsky.social";
  }

  /**
   * Authenticate as the platform AT Proto account using env var credentials.
   */
  private async getPlatformAgent(): Promise<{ agent: AtpAgent; did: string }> {
    const handle = env.ATPROTO_PLATFORM_HANDLE;
    const appPassword = env.ATPROTO_PLATFORM_APP_PASSWORD;

    if (!handle || !appPassword) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Platform AT Proto account not configured. Set ATPROTO_PLATFORM_HANDLE and ATPROTO_PLATFORM_APP_PASSWORD environment variables.",
      });
    }

    try {
      console.log(`[DDS] Attempting login: handle=${handle}, pdsUrl=${this.pdsUrl}, passwordLength=${appPassword.length}`);
      const agent = new AtpAgent({ service: this.pdsUrl });
      const response = await agent.login({
        identifier: handle.replace(/^@/, ""),
        password: appPassword,
      });

      if (!response.success) {
        throw new Error("Login returned unsuccessful response");
      }

      const did = response.data.did;
      console.log(`[DDS] Login successful: did=${did}`);
      return { agent, did };
    } catch (error) {
      console.error(`[DDS] Login failed:`, error);
      Sentry.captureException(error, {
        tags: { service: "dds", operation: "platform_login" },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Failed to authenticate platform AT Proto account. Check credentials.",
      });
    }
  }

  /**
   * Gather deliberation data including analysis result and topic clusters.
   */
  private async gatherDeliberationData(
    deliberationId: string,
  ): Promise<DeliberationData> {
    const deliberation = await this.db.deliberation.findUnique({
      where: { id: deliberationId },
      include: {
        event: { select: { id: true, name: true } },
        topicClusters: {
          select: { label: true, keywords: true, mentionCount: true },
          orderBy: { mentionCount: "desc" },
        },
      },
    });

    if (!deliberation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Deliberation not found",
      });
    }

    if (!deliberation.analysisResult) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Deliberation has no analysis result. Run analysis before publishing.",
      });
    }

    return {
      id: deliberation.id,
      title: deliberation.title,
      description: deliberation.description,
      eventName: deliberation.event.name,
      eventId: deliberation.event.id,
      analysisResult: deliberation.analysisResult as unknown as AnalysisResult,
      topicClusters: deliberation.topicClusters,
    };
  }

  /**
   * Create an org.dds.result.summary record with the narrative synthesis.
   */
  private async createSummaryRecord(
    agent: AtpAgent,
    did: string,
    data: DeliberationData,
  ): Promise<CreateRecordResponse> {
    const analysis = data.analysisResult;

    const record: Record<string, unknown> = {
      $type: "org.dds.result.summary",
      deliberationTitle: data.title.slice(0, 256),
      eventName: data.eventName.slice(0, 256),
      synthesis: analysis.synthesis,
      statistics: analysis.statistics,
      blockerThemes: analysis.blockerThemes,
      resourceRecommendations: analysis.resourceRecommendations,
      createdAt: new Date().toISOString(),
    };

    const response = (await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: "org.dds.result.summary",
      record,
    })) as unknown as { data: CreateRecordResponse };

    return response.data;
  }

  /**
   * Create an org.dds.result.pca record with classified priorities and topic clusters.
   */
  private async createPCARecord(
    agent: AtpAgent,
    did: string,
    data: DeliberationData,
    summaryUri: string,
    summaryCid: string,
  ): Promise<CreateRecordResponse> {
    const analysis = data.analysisResult;

    const record: Record<string, unknown> = {
      $type: "org.dds.result.pca",
      subject: {
        uri: summaryUri,
        cid: summaryCid,
      },
      classifiedPriorities: analysis.classifiedPriorities,
      topicClusters: data.topicClusters.map((tc) => ({
        label: tc.label,
        keywords: tc.keywords,
        mentionCount: tc.mentionCount,
      })),
      createdAt: new Date().toISOString(),
    };

    const response = (await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: "org.dds.result.pca",
      record,
    })) as unknown as { data: CreateRecordResponse };

    return response.data;
  }

  /**
   * Create an org.hypercerts.claim.activity record for the deliberation.
   */
  private async createActivityRecord(
    agent: AtpAgent,
    did: string,
    data: DeliberationData,
    summaryUri: string,
    summaryCid: string,
  ): Promise<CreateRecordResponse> {
    const stats = data.analysisResult.statistics;
    const shortDescription =
      data.description?.slice(0, 300) ??
      `Community deliberation: ${data.title}`;

    const record: Record<string, unknown> = {
      $type: "org.hypercerts.claim.activity",
      title: `Deliberation: ${data.title}`.slice(0, 256),
      shortDescription,
      createdAt: new Date().toISOString(),
      workScope: "deliberation",
      metadata: {
        deliberationId: data.id,
        eventId: data.eventId,
        summaryRef: {
          uri: summaryUri,
          cid: summaryCid,
        },
        participantStats: {
          totalPriorities: stats.totalPriorities,
          totalVotes: stats.totalVotes,
          topicClusterCount: stats.topicClusterCount,
        },
      },
    };

    const response = (await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: "org.hypercerts.claim.activity",
      record,
    })) as unknown as { data: CreateRecordResponse };

    return response.data;
  }

  /**
   * Create an org.hyperboards.board record pointing to the activity.
   */
  private async createBoardRecord(
    agent: AtpAgent,
    did: string,
    activityUri: string,
    activityCid: string,
  ): Promise<CreateRecordResponse> {
    const record: Record<string, unknown> = {
      $type: "org.hyperboards.board",
      subject: {
        uri: activityUri,
        cid: activityCid,
      },
      createdAt: new Date().toISOString(),
    };

    const response = (await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: "org.hyperboards.board",
      record,
    })) as unknown as { data: CreateRecordResponse };

    return response.data;
  }

  /**
   * Publish deliberation results to AT Protocol PDS.
   * Creates four records: summary, PCA, activity, and board.
   * Stores all URIs/CIDs on the Deliberation model.
   */
  async publishResults(deliberationId: string): Promise<PublishDDSResult> {
    try {
      const { agent, did } = await this.getPlatformAgent();
      const data = await this.gatherDeliberationData(deliberationId);

      // 1. Summary record (narrative synthesis + stats)
      const summary = await this.createSummaryRecord(agent, did, data);

      // 2. PCA record (priorities + topic clusters), references summary
      const pca = await this.createPCARecord(
        agent,
        did,
        data,
        summary.uri,
        summary.cid,
      );

      // 3. Activity record (hypercerts claim), references summary
      const activity = await this.createActivityRecord(
        agent,
        did,
        data,
        summary.uri,
        summary.cid,
      );

      // 4. Board record, references activity
      const board = await this.createBoardRecord(
        agent,
        did,
        activity.uri,
        activity.cid,
      );

      const result: PublishDDSResult = {
        summaryUri: summary.uri,
        summaryCid: summary.cid,
        pcaUri: pca.uri,
        pcaCid: pca.cid,
        activityUri: activity.uri,
        activityCid: activity.cid,
        boardUri: board.uri,
        boardCid: board.cid,
      };

      // 5. Store URIs/CIDs on Deliberation and set status to PUBLISHED
      await this.db.deliberation.update({
        where: { id: deliberationId },
        data: {
          ...result,
          status: "PUBLISHED",
        },
      });

      return result;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      Sentry.captureException(error, {
        tags: {
          service: "dds",
          operation: "publish_results",
        },
        extra: { deliberationId },
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to publish deliberation results to DDS",
      });
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createDDSPublicationService(
  db: PrismaClient,
): DDSPublicationService {
  return new DDSPublicationService(db);
}
