import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import {
  createExponentialAction,
  saveExponentialScreenshot,
} from "~/server/services/exponential";
import { captureApiError } from "~/utils/errorCapture";

export const bugReportRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
        screenshot: z.string().max(10_000_000).optional(),
        consoleLogs: z
          .array(
            z.object({
              level: z.enum(["error", "warn"]),
              message: z.string(),
              timestamp: z.string(),
            }),
          )
          .optional(),
        metadata: z.object({
          pathname: z.string(),
          userAgent: z.string(),
          screenSize: z.string(),
          eventId: z.string().optional(),
          timestamp: z.string(),
          profileUrl: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projectId = env.EXPONENTIAL_BUG_PROJECT_ID;
      if (!projectId) {
        throw new Error("EXPONENTIAL_BUG_PROJECT_ID is not configured");
      }

      const userName =
        ctx.session.user.name ?? ctx.session.user.email ?? ctx.session.user.id;

      // Build a rich action name with key context (capped at 255 chars by Exponential DB)
      const nameParts = [
        `[Bug] ${input.title}`,
        `| ${input.metadata.pathname}`,
        `| ${userName}`,
      ];
      if (input.metadata.profileUrl) {
        nameParts.push(`| ${input.metadata.profileUrl}`);
      }
      if (input.description) {
        nameParts.push(`| ${input.description}`);
      }
      if (input.consoleLogs && input.consoleLogs.length > 0) {
        nameParts.push(`| ${String(input.consoleLogs.length)} console errors`);
      }
      const actionName = nameParts.join(" ").slice(0, 255);

      try {
        const action = await createExponentialAction({
          name: actionName,
          projectId,
          priority: "2nd Priority",
          source: "ftc-platform",
          parseNaturalLanguage: false,
        });

        if (input.screenshot) {
          const base64Data = input.screenshot.replace(
            /^data:image\/\w+;base64,/,
            "",
          );
          await saveExponentialScreenshot({
            actionId: action.id,
            screenshot: base64Data,
            timestamp: input.metadata.timestamp,
          });
        }

        return {
          success: true as const,
          actionUrl: action.url,
        };
      } catch (error) {
        captureApiError(error, {
          userId: ctx.session.user.id,
          route: "bugReport.submit",
          method: "POST",
          input: {
            title: input.title,
            hasScreenshot: !!input.screenshot,
            consoleLogCount: input.consoleLogs?.length ?? 0,
          },
        });
        throw error;
      }
    }),
});
