import { AtpAgent, type AppBskyFeedPost } from "@atproto/api";
import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { env } from "~/env.js";
import { encrypt, decrypt, isEncryptionConfigured } from "~/utils/encryption";
import * as Sentry from "@sentry/nextjs";

interface AtProtoCredentials {
  handle: string;
  appPassword: string;
}

interface PostContent {
  text: string;
  facets?: AppBskyFeedPost.Record["facets"];
  embed?: AppBskyFeedPost.Record["embed"];
}

export class AtProtoService {
  private db: PrismaClient;
  private pdsUrl: string;

  constructor(db: PrismaClient, customPdsUrl?: string) {
    this.db = db;
    this.pdsUrl = customPdsUrl ?? env.ATPROTO_PDS_URL ?? "https://bsky.social";
  }

  /**
   * Creates a new AT Proto agent instance
   */
  private createAgent(): AtpAgent {
    return new AtpAgent({
      service: this.pdsUrl,
    });
  }

  /**
   * Authenticates a user and stores encrypted credentials
   */
  async connectAccount(
    userId: string,
    credentials: AtProtoCredentials,
  ): Promise<{ handle: string; did: string; pdsUrl: string }> {
    try {
      // Check if encryption is configured
      if (!isEncryptionConfigured()) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "AT Proto encryption is not configured. Please contact an administrator.",
        });
      }

      // Create agent and login
      const agent = this.createAgent();
      const cleanHandle = credentials.handle.replace("@", "");

      const loginResponse = await agent.login({
        identifier: cleanHandle,
        password: credentials.appPassword,
      });

      if (!loginResponse.success || !loginResponse.data.did) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to authenticate with AT Proto server",
        });
      }

      // Encrypt the JWT tokens
      const encryptedAccessJwt = encrypt(loginResponse.data.accessJwt);
      const encryptedRefreshJwt = encrypt(loginResponse.data.refreshJwt);

      // Store or update the account in database
      const account = await this.db.atProtoAccount.upsert({
        where: { userId },
        create: {
          userId,
          handle: cleanHandle,
          did: loginResponse.data.did,
          pdsUrl: this.pdsUrl,
          accessJwt: encryptedAccessJwt,
          refreshJwt: encryptedRefreshJwt,
          lastUsedAt: new Date(),
        },
        update: {
          handle: cleanHandle,
          did: loginResponse.data.did,
          pdsUrl: this.pdsUrl,
          accessJwt: encryptedAccessJwt,
          refreshJwt: encryptedRefreshJwt,
          lastUsedAt: new Date(),
        },
      });

      return {
        handle: account.handle,
        did: account.did,
        pdsUrl: account.pdsUrl,
      };
    } catch (error) {
      // Log to Sentry
      Sentry.captureException(error, {
        tags: {
          service: "atproto",
          operation: "connect_account",
        },
        extra: {
          userId,
          pdsUrl: this.pdsUrl,
        },
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      // Handle specific AT Proto errors
      if (error instanceof Error) {
        if (error.message.includes("Invalid identifier or password")) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Invalid handle or app password. Make sure you're using an app password, not your main password.",
          });
        }
        if (
          error.message.includes("network") ||
          error.message.includes("ENOTFOUND")
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Unable to connect to AT Proto server. Please try again later.",
          });
        }
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to connect AT Proto account",
      });
    }
  }

  /**
   * Disconnects and removes stored credentials
   */
  async disconnectAccount(userId: string): Promise<void> {
    try {
      await this.db.atProtoAccount.delete({
        where: { userId },
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: "atproto",
          operation: "disconnect_account",
        },
        extra: { userId },
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to disconnect AT Proto account",
      });
    }
  }

  /**
   * Gets the connection status for a user
   */
  async getConnectionStatus(userId: string): Promise<{
    isConnected: boolean;
    handle?: string;
    did?: string;
    pdsUrl?: string;
  } | null> {
    try {
      const account = await this.db.atProtoAccount.findUnique({
        where: { userId },
        select: {
          handle: true,
          did: true,
          pdsUrl: true,
        },
      });

      if (!account) {
        return { isConnected: false };
      }

      return {
        isConnected: true,
        handle: account.handle,
        did: account.did,
        pdsUrl: account.pdsUrl,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: "atproto",
          operation: "get_connection_status",
        },
        extra: { userId },
      });

      return null;
    }
  }

  /**
   * Gets an authenticated agent for a user
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
      // Decrypt credentials
      const accessJwt = decrypt(account.accessJwt);
      const refreshJwt = decrypt(account.refreshJwt);

      // Create agent and resume session
      const agent = this.createAgent();
      await agent.resumeSession({
        accessJwt,
        refreshJwt,
        did: account.did,
        handle: account.handle,
        active: true,
      });

      // Update last used timestamp
      await this.db.atProtoAccount.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });

      return agent;
    } catch (error) {
      // If session is invalid, try to refresh
      if (error instanceof Error && error.message.includes("token")) {
        await this.refreshSession(userId);
        return this.getAuthenticatedAgent(userId); // Retry with new tokens
      }

      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "Failed to authenticate with AT Proto. Please reconnect your account.",
      });
    }
  }

  /**
   * Refreshes the session tokens
   */
  private async refreshSession(userId: string): Promise<void> {
    const account = await this.db.atProtoAccount.findUnique({
      where: { userId },
    });

    if (!account?.refreshJwt) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No refresh token available",
      });
    }

    try {
      const refreshJwt = decrypt(account.refreshJwt);
      const agent = this.createAgent();

      // Attempt to refresh the session
      const response = await agent.com.atproto.server.refreshSession(
        undefined,
        { headers: { authorization: `Bearer ${refreshJwt}` } },
      );

      // Encrypt and store new tokens
      const encryptedAccessJwt = encrypt(response.data.accessJwt);
      const encryptedRefreshJwt = encrypt(response.data.refreshJwt);

      await this.db.atProtoAccount.update({
        where: { userId },
        data: {
          accessJwt: encryptedAccessJwt,
          refreshJwt: encryptedRefreshJwt,
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: "atproto",
          operation: "refresh_session",
        },
        extra: { userId },
      });

      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Failed to refresh session. Please reconnect your account.",
      });
    }
  }

  /**
   * Gets user's posts from AT Proto
   */
  async getUserPosts(
    userId: string,
    limit = 10,
  ): Promise<
    Array<{
      uri: string;
      cid: string;
      text: string;
      createdAt: string;
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

      // Fetch posts using listRecords
      const response = await agent.com.atproto.repo.listRecords({
        repo: account.did,
        collection: "app.bsky.feed.post",
        limit,
      });

      // Map records to post format
      const posts = response.data.records.map((record) => ({
        uri: record.uri,
        cid: record.cid,
        text: (record.value as { text: string }).text,
        createdAt: (record.value as { createdAt: string }).createdAt,
      }));

      return posts;
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          service: "atproto",
          operation: "get_user_posts",
        },
        extra: { userId, limit },
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch posts from AT Proto",
      });
    }
  }

  /**
   * Creates a post on AT Proto
   */
  async createPost(
    userId: string,
    content: PostContent,
  ): Promise<{ uri: string; cid: string }> {
    try {
      const agent = await this.getAuthenticatedAgent(userId);

      console.log("📝 Creating AT Proto post:", {
        userId,
        textLength: content.text.length,
        pdsUrl: this.pdsUrl,
      });

      const response = await agent.post({
        text: content.text,
        facets: content.facets,
        embed: content.embed,
        createdAt: new Date().toISOString(),
      });

      console.log("✅ Post created successfully:", {
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
          service: "atproto",
          operation: "create_post",
        },
        extra: {
          userId,
          textLength: content.text.length,
        },
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create post on AT Proto",
      });
    }
  }
}

/**
 * Factory function to create an AtProtoService instance
 */
export function createAtProtoService(
  db: PrismaClient,
  customPdsUrl?: string,
): AtProtoService {
  return new AtProtoService(db, customPdsUrl);
}
