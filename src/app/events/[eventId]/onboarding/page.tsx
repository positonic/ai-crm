import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import ManagePageClient from "./ManagePageClient";
import { getDisplayName } from "~/utils/userDisplay";

export default async function FundingCommonsResidencyManagePage() {
  // Check authentication
  const session = await auth();

  if (!session?.user) {
    redirect("/events/funding-commons-residency-2025?tab=application");
  }

  // Fetch event details and user's application
  const event = await db.event.findUnique({
    where: { id: "funding-commons-residency-2025" },
    include: {
      applications: {
        where: { userId: session.user.id },
        include: {
          responses: {
            include: {
              question: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    redirect("/events/funding-commons-residency-2025");
  }

  const userApplication = event.applications[0];

  // Debug logging
  console.log("🔍 Manage page debug:", {
    hasApplication: !!userApplication,
    status: userApplication?.status,
    userId: session.user.id,
    eventId: event.id,
  });

  // Only accepted users can access the manage page
  if (!userApplication) {
    // No application found - redirect to apply page
    redirect("/events/funding-commons-residency-2025?tab=application");
  }

  if (userApplication.status !== "ACCEPTED") {
    // Application exists but not accepted - show a message instead of redirect
    return (
      <div>
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 px-4 py-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-blue-900 font-semibold">
                FtC RealFi Residency • Buenos Aires 2025
              </p>
              <p className="text-blue-700 text-sm">
                Onboarding is only available for accepted applications
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl py-12 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Onboarding Not Available</h1>
          <p className="text-gray-600 mb-6">
            Your application status is:{" "}
            <strong className="capitalize">
              {userApplication.status.toLowerCase().replace("_", " ")}
            </strong>
          </p>
          <p className="text-gray-600 mb-8">
            Onboarding is only available for accepted applications. If you
            believe this is an error, please contact support.
          </p>
          <Link
            href="/events/funding-commons-residency-2025"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Event Overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-200 px-4 py-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-0 sm:space-x-3">
              <div className="hidden sm:flex bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2 mt-0.5">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-blue-900 font-semibold">
                  FtC RealFi Residency • Buenos Aires 2025
                </p>
                <p className="text-blue-700 text-sm">
                  Manage your onboarding and travel details
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/events/funding-commons-residency-2025"
                className="bg-white hover:bg-gray-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-200 text-center"
              >
                ← Back to Overview
              </Link>
              <Link
                href="/events/funding-commons-residency-2025/about"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-center"
              >
                Residency Focus
              </Link>
              <Link
                href="/events/funding-commons-residency-2025/faq"
                className="bg-white hover:bg-gray-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-200 text-center"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ManagePageClient
        applicationId={userApplication.id}
        applicantName={getDisplayName(session.user, "there")}
      />
    </div>
  );
}
