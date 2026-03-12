import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { assertDeliberationAdmin } from "~/server/api/utils/deliberationAuth";
import { assertAdminOrEventFloorOwner } from "~/server/api/utils/scheduleAuth";

export const transcriptionRouter = createTRPCRouter({
  getByDeliberation: protectedProcedure
    .input(z.object({ deliberationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: { eventId: true },
      });
      if (!deliberation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deliberation not found",
        });
      }

      await assertDeliberationAdmin(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        deliberation.eventId,
      );

      return ctx.db.transcription.findMany({
        where: { deliberationId: input.deliberationId },
        select: {
          id: true,
          title: true,
          status: true,
          source: true,
          audioFileName: true,
          createdAt: true,
          updatedAt: true,
          uploadedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.eventId,
      );

      return ctx.db.transcription.findMany({
        where: { eventId: input.eventId },
        select: {
          id: true,
          title: true,
          status: true,
          source: true,
          audioFileName: true,
          sessionId: true,
          createdAt: true,
          updatedAt: true,
          uploadedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const transcription = await ctx.db.transcription.findUnique({
        where: { id: input.id },
        include: {
          uploadedBy: { select: { id: true, name: true } },
          event: { select: { id: true, name: true } },
          deliberation: { select: { id: true, title: true } },
        },
      });

      if (!transcription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transcription not found",
        });
      }

      if (!transcription.eventId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Transcription has no associated event for authorization",
        });
      }

      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        transcription.eventId,
      );

      return transcription;
    }),

  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        sessionId: z.string().optional(),
        title: z.string().min(1),
        transcript: z.string().min(1),
        notes: z.string().optional(),
        transcriptionType: z.enum(["session", "interview", "other"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertAdminOrEventFloorOwner(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        input.eventId,
      );

      const title =
        input.transcriptionType === "interview"
          ? `[Interview] ${input.title}`
          : input.transcriptionType === "other"
            ? `[Other] ${input.title}`
            : input.title;

      return ctx.db.transcription.create({
        data: {
          eventId: input.eventId,
          sessionId:
            input.transcriptionType === "session"
              ? input.sessionId
              : undefined,
          title,
          transcript: input.transcript,
          notes: input.notes,
          source: "MANUAL",
          status: "COMPLETED",
          processedAt: new Date(),
          uploadedById: ctx.session.user.id,
        },
      });
    }),
});
