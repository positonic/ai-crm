import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createAtProtoService } from "~/server/services/atproto";
import { TRPCError } from "@trpc/server";

export const atprotoRouter = createTRPCRouter({
  /**
   * Connect an AT Proto account (Bluesky or custom PDS)
   */
  connectAccount: protectedProcedure
    .input(
      z.object({
        handle: z.string().min(1, "Handle is required"),
        appPassword: z.string().min(4, "App password is required"),
        customPdsUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createAtProtoService(ctx.db, input.customPdsUrl);

      const result = await service.connectAccount(ctx.session.user.id, {
        handle: input.handle,
        appPassword: input.appPassword,
      });

      return {
        success: true,
        handle: result.handle,
        did: result.did,
        pdsUrl: result.pdsUrl,
      };
    }),

  /**
   * Disconnect the AT Proto account
   */
  disconnectAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const service = createAtProtoService(ctx.db);
    await service.disconnectAccount(ctx.session.user.id);

    return {
      success: true,
    };
  }),

  /**
   * Get connection status
   */
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const service = createAtProtoService(ctx.db);
    const status = await service.getConnectionStatus(ctx.session.user.id);

    return status ?? { isConnected: false };
  }),

  /**
   * Get user's posts from AT Proto
   */
  getMyPosts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const service = createAtProtoService(ctx.db);
        const posts = await service.getUserPosts(
          ctx.session.user.id,
          input.limit,
        );
        return posts;
      } catch (error) {
        // Fail gracefully for auth errors - return empty array
        if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
          return [];
        }
        throw error;
      }
    }),

  /**
   * Create a post on AT Proto
   */
  createPost: protectedProcedure
    .input(
      z.object({
        text: z
          .string()
          .min(1, "Post text is required")
          .max(300, "Post is too long (max 300 characters)"),
        customPdsUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createAtProtoService(ctx.db, input.customPdsUrl);

      try {
        const result = await service.createPost(ctx.session.user.id, {
          text: input.text,
        });

        return {
          success: true,
          uri: result.uri,
          cid: result.cid,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create post",
        });
      }
    }),

  /**
   * Share a project on AT Proto
   */
  shareProject: protectedProcedure
    .input(
      z.object({
        projectTitle: z.string().min(1, "Project title is required"),
        projectUrl: z.string().url("Invalid project URL"),
        customPdsUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const service = createAtProtoService(ctx.db, input.customPdsUrl);

      // Create a formatted post about the project
      const postText = `🚀 Check out my project: ${input.projectTitle}\n\n${input.projectUrl}\n\n#BuildingInPublic #FundingTheCommons`;

      try {
        const result = await service.createPost(ctx.session.user.id, {
          text: postText,
        });

        return {
          success: true,
          uri: result.uri,
          cid: result.cid,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to share project",
        });
      }
    }),
});
