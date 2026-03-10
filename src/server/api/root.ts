import { postRouter } from "~/server/api/routers/post";
import { contactRouter } from "~/server/api/routers/contact";
import { sponsorRouter } from "~/server/api/routers/sponsor";
import { eventRouter } from "~/server/api/routers/event";
import { coinGeckoRouter } from "~/server/api/routers/coinGecko";
import { roleRouter } from "~/server/api/routers/role";
import { applicationRouter } from "~/server/api/routers/application";
import { emailRouter } from "~/server/api/routers/email";
import { communicationRouter } from "~/server/api/routers/communication";
import { invitationRouter } from "~/server/api/routers/invitation";
import { userRouter } from "~/server/api/routers/user";
import { projectIdeaRouter } from "~/server/api/routers/projectIdea";
import { evaluationRouter } from "~/server/api/routers/evaluation";
import { profileRouter } from "~/server/api/routers/profile";
import { onboardingRouter } from "~/server/api/routers/onboarding";
import { telegramAuthRouter } from "~/server/api/routers/telegramAuth";
import { projectRouter } from "~/server/api/routers/project";
import { skillsRouter } from "~/server/api/routers/skills";
import { configRouter } from "~/server/api/routers/config";
import { analyticsRouter } from "~/server/api/routers/analytics";
import { passwordResetRouter } from "~/server/api/routers/passwordReset";
import { askOfferRouter } from "~/server/api/routers/askOffer";
import { praiseRouter } from "~/server/api/routers/praise";
import { kudosRouter } from "~/server/api/routers/kudos";
import { metricRouter } from "~/server/api/routers/metric";
import { atprotoRouter } from "~/server/api/routers/atproto";
import { hypercertsRouter } from "~/server/api/routers/hypercerts";
import { forumRouter } from "~/server/api/routers/forum";
import { scheduleRouter } from "~/server/api/routers/schedule";
import { aiInteractionRouter } from "~/server/api/routers/aiInteraction";
import { bugReportRouter } from "~/server/api/routers/bugReport";
import { deliberationRouter } from "~/server/api/routers/deliberation";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  contact: contactRouter,
  sponsor: sponsorRouter,
  event: eventRouter,
  coinGecko: coinGeckoRouter,
  role: roleRouter,
  application: applicationRouter,
  email: emailRouter,
  communication: communicationRouter,
  invitation: invitationRouter,
  user: userRouter,
  projectIdea: projectIdeaRouter,
  evaluation: evaluationRouter,
  profile: profileRouter,
  onboarding: onboardingRouter,
  telegramAuth: telegramAuthRouter,
  project: projectRouter,
  skills: skillsRouter,
  config: configRouter,
  analytics: analyticsRouter,
  passwordReset: passwordResetRouter,
  askOffer: askOfferRouter,
  praise: praiseRouter,
  kudos: kudosRouter,
  metric: metricRouter,
  atproto: atprotoRouter,
  hypercerts: hypercertsRouter,
  forum: forumRouter,
  schedule: scheduleRouter,
  aiInteraction: aiInteractionRouter,
  bugReport: bugReportRouter,
  deliberation: deliberationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
