import { AtpAgent } from "@atproto/api";
import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { env } from "~/env.js";
import { decrypt } from "~/utils/encryption";
import * as Sentry from "@sentry/nextjs";

interface HypercertData {
  title: string;
  shortDescription: string;
  description?: string;
  workScope: string;
  workTimeFrameFrom: string; // ISO datetime
  workTimeFrameTo: string; // ISO datetime
  image?: string; // URI or blob
  evidence?: string[]; // Strong refs to evidence records
  contributions?: string[]; // Strong refs to contribution records
  rights?: string; // Strong ref to rights record
  location?: string; // Strong ref to location record
}

interface AtProtoCreateRecordResponse {
  uri: string;
  cid: string;
}

interface AtProtoGetRecordResponse {
  uri: string;
  cid?: string;
  value: unknown;
}

export class HypercertsService {
  private db: PrismaClient;
  private pdsUrl: string;

  constructor(db: PrismaClient, customPdsUrl?: string) {
    this.db = db;
    this.pdsUrl = customPdsUrl ?? env.ATPROTO_PDS_URL ?? "https://bsky.social";
  }

  /**
   * Creates an authenticated agent for a user
   */
  private async getAuthenticatedAgent(userId: string): Promise<AtpAgent> {
    const account = await this.db.atProtoAccount.findUnique({
      where: { userId },
    });

    if (!account?.accessJwt || !account.refreshJwt) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "No AT Proto account connected. Please connect your account first.",
      });
    }

    try {
      const accessJwt = decrypt(account.accessJwt);
      const refreshJwt = decrypt(account.refreshJwt);

      const agent = new AtpAgent({
        service: this.pdsUrl,
      });

      await agent.resumeSession({
        accessJwt,
        refreshJwt,
        did: account.did,
        handle: account.handle,
        active: true,
      });

      return agent;
    } catch {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "Failed to authenticate with AT Proto. Please reconnect your account.",
      });
    }
  }

  /**
   * Creates a hypercert record on the user's PDS
   */
  async createHypercert(
    userId: string,
    data: HypercertData,
  ): Promise<{
    uri: string;
    cid: string;
  }> {
    try {
      const agent = await this.getAuthenticatedAgent(userId);
      const account = await this.db.atProtoAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AT Proto account not found",
        });
      }

      console.log("📜 Creating hypercert record:", {
        userId,
        title: data.title,
        pdsUrl: this.pdsUrl,
      });

      // Create the hypercert record
      const response = (await agent.com.atproto.repo.createRecord({
        repo: account.did,
        collection: "org.hypercerts.claim",
        record: {
          $type: "org.hypercerts.claim",
          title: data.title,
          shortDescription: data.shortDescription,
          description: data.description,
          workScope: data.workScope,
          workTimeFrameFrom: data.workTimeFrameFrom,
          workTimeFrameTo: data.workTimeFrameTo,
          image: data.image,
          evidence: data.evidence,
          contributions: data.contributions,
          rights: data.rights,
          location: data.location,
          createdAt: new Date().toISOString(),
        },
      })) as unknown as AtProtoCreateRecordResponse;

      console.log("✅ Hypercert created successfully:", {
        uri: response.uri,
        cid: response.cid,
      });

      return {
        uri: response.uri,
        cid: response.cid,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: "hypercerts",
          operation: "create_hypercert",
        },
        extra: {
          userId,
          title: data.title,
        },
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create hypercert",
      });
    }
  }

  /**
   * Lists hypercerts for a user
   */
  async listHypercerts(
    userId: string,
    limit = 10,
  ): Promise<
    Array<{
      uri: string;
      cid: string;
      value: HypercertData & { createdAt: string };
    }>
  > {
    try {
      const agent = await this.getAuthenticatedAgent(userId);
      const account = await this.db.atProtoAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AT Proto account not found",
        });
      }

      // List hypercert records
      const response = await agent.com.atproto.repo.listRecords({
        repo: account.did,
        collection: "org.hypercerts.claim",
        limit,
      });

      return response.data.records.map((record) => ({
        uri: record.uri,
        cid: record.cid,
        value: record.value as unknown as HypercertData & { createdAt: string },
      }));
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: "hypercerts",
          operation: "list_hypercerts",
        },
        extra: { userId, limit },
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list hypercerts",
      });
    }
  }

  /**
   * Gets a specific hypercert by rkey
   */
  async getHypercert(
    userId: string,
    rkey: string,
  ): Promise<{
    uri: string;
    cid: string;
    value: HypercertData & { createdAt: string };
  }> {
    try {
      const agent = await this.getAuthenticatedAgent(userId);
      const account = await this.db.atProtoAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AT Proto account not found",
        });
      }

      // Get the hypercert record
      const response = (await agent.com.atproto.repo.getRecord({
        repo: account.did,
        collection: "org.hypercerts.claim",
        rkey,
      })) as unknown as AtProtoGetRecordResponse;

      return {
        uri: response.uri,
        cid: response.cid ?? "",
        value: response.value as HypercertData & { createdAt: string },
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: "hypercerts",
          operation: "get_hypercert",
        },
        extra: { userId, rkey },
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get hypercert",
      });
    }
  }
}

/**
 * Factory function to create a HypercertsService instance
 */
export function createHypercertsService(
  db: PrismaClient,
  customPdsUrl?: string,
): HypercertsService {
  return new HypercertsService(db, customPdsUrl);
}
