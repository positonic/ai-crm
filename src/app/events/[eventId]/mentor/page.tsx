import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import MentorPageClient from "./MentorPageClient";

export default async function FundingCommonsResidencyMentorPage({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string }>;
}) {
  // Check authentication but don't redirect
  const session = await auth();

  // Extract invitation token from search params
  const resolvedSearchParams = await searchParams;
  let invitationToken = resolvedSearchParams.invitation;

  // Clean up doubled token (e.g., "token?invitation=token" -> "token")
  if (invitationToken?.includes("?invitation=")) {
    invitationToken = invitationToken.split("?invitation=")[0];
  }

  console.log("🎫 [Mentor Page] Invitation token from URL:", invitationToken);

  // Fetch event details for the specific residency
  const event = await db.event.findUnique({
    where: { id: "funding-commons-residency-2025" },
    include: {
      applications: session?.user
        ? {
            where: {
              userId: session.user.id,
              applicationType: "MENTOR",
            },
            include: {
              responses: {
                include: {
                  question: true,
                },
              },
            },
          }
        : false, // Don't fetch applications if not authenticated
    },
  });

  if (!event) {
    // If specific event doesn't exist, fallback to the generic dynamic route
    redirect("/events/funding-commons-residency-2025");
  }

  // Check if user has an existing application (only if authenticated)
  const userApplication =
    session?.user && Array.isArray(event.applications)
      ? (event.applications[0] ?? null)
      : null;

  // Create a properly typed event for MentorPageClient
  const typedEvent = {
    ...event,
    applications: Array.isArray(event.applications) ? event.applications : [],
  };

  return (
    <div>
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-emerald-200 px-4 py-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-0 sm:space-x-3">
              <div className="hidden sm:flex bg-gradient-to-r from-emerald-600 to-blue-600 rounded-lg p-2 mt-0.5">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-emerald-900 font-semibold">
                  FtC RealFi Residency • Mentor Onboarding
                </p>
                <p className="text-emerald-700 text-sm">
                  Join us as a mentor for three weeks of collaboration in Buenos
                  Aires
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/events/funding-commons-residency-2025"
                className="bg-white hover:bg-gray-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-emerald-200 text-center"
              >
                ← Back to Overview
              </Link>
              <Link
                href="/events/funding-commons-residency-2025/about"
                className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-center"
              >
                Program Details
              </Link>
              <Link
                href="/events/funding-commons-residency-2025/faq"
                className="bg-white hover:bg-gray-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-emerald-200 text-center"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>

      <MentorPageClient
        event={typedEvent}
        initialUserApplication={userApplication}
        initialUserId={session?.user?.id}
        invitationToken={invitationToken}
      />
    </div>
  );
}
