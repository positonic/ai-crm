import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
import OnboardingAdminClient from "./OnboardingAdminClient";

export default async function OnboardingAdminPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  // Get all onboarding submissions
  const onboardingData = await db.applicationOnboarding.findMany({
    include: {
      application: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return <OnboardingAdminClient onboardingData={onboardingData} />;
}
