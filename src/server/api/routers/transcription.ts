import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { assertDeliberationAdmin } from "~/server/api/utils/deliberationAuth";

export const transcriptionRouter = createTRPCRouter({
  getByDeliberation: protectedProcedure
    .input(z.object({ deliberationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const deliberation = await ctx.db.deliberation.findUnique({
        where: { id: input.deliberationId },
        select: { eventId: true },
      });
      if (!deliberation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deliberation not found" });
      }

      await assertDeliberationAdmin(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.role,
        deliberation.eventId,
      );

      return ctx.db.transcription.findMany({
        where: { deliberationId: input.deliberationId },
        include: {
          uploadedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.transcription.findMany({
        where: { eventId: input.eventId },
        include: {
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Transcription not found" });
      }

      return transcription;
    }),
});
