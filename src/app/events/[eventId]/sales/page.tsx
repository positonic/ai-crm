import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "FtC RealFi Builder Residency 2025 - Buenos Aires",
  description:
    "Join a 3-week intensive residency in Buenos Aires building real-world blockchain applications. Free accommodation and meals provided, expert mentorship.",
  openGraph: {
    title: "FtC RealFi Builder Residency 2025 - Buenos Aires",
    description:
      "Build the future of financial inclusion with blockchain technology. Apply now for the Funding the Commons Builder Residency.",
    images: ["/og-residency.png"],
  },
};

export default async function FundingCommonsResidencyLandingPage() {
  // Check if user is authenticated (optional - for showing different CTAs)
  const session = await auth();

  // Get event details for displaying stats
  const event = await db.event.findUnique({
    where: { id: "funding-commons-residency-2025" },
    select: {
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  const applicationCount = event?._count?.applications ?? 0;
  const spotsRemaining = Math.max(0, 30 - applicationCount); // Assuming 30 spots

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-4 py-20 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium">
                  Applications Open • {spotsRemaining} Spots Remaining
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Build the Future of{" "}
                <span className="text-yellow-300">RealFi</span> in Buenos Aires
              </h1>

              <p className="text-xl lg:text-2xl mb-8 leading-relaxed opacity-95">
                Join a 3-week intensive residency developing blockchain
                solutions for real-world financial inclusion in Latin America.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {session?.user ? (
                  <Link
                    href="/events/funding-commons-residency-2025?tab=application"
                    className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:bg-yellow-300 hover:text-blue-900 transition-all duration-200 shadow-lg text-center transform hover:scale-105"
                  >
                    Continue to Application →
                  </Link>
                ) : (
                  <Link
                    href="/signin?callbackUrl=/events/funding-commons-residency-2025?tab=application"
                    className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:bg-yellow-300 hover:text-blue-900 transition-all duration-200 shadow-lg text-center transform hover:scale-105"
                  >
                    Start Your Application →
                  </Link>
                )}
                <Link
                  href="#program-overview"
                  className="bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-400/30 transition-colors text-center"
                >
                  Learn More
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-3xl font-bold mb-1">Oct 24 - Nov 14</p>
                  <p className="text-sm opacity-90">2025 Program Dates</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-3xl font-bold mb-1">Free</p>
                  <p className="text-sm opacity-90">Accommodation & Food</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-3xl transform rotate-3 opacity-20"></div>
                <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-400 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🏠</span>
                      </div>
                      <div>
                        <p className="font-semibold">Housing Provided</p>
                        <p className="text-sm opacity-90">
                          Stay in the heart of Buenos Aires
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🍽️</span>
                      </div>
                      <div>
                        <p className="font-semibold">Meals Included</p>
                        <p className="text-sm opacity-90">
                          All meals provided during residency
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">👥</span>
                      </div>
                      <div>
                        <p className="font-semibold">Expert Mentorship</p>
                        <p className="text-sm opacity-90">
                          Learn from industry leaders
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-pink-400 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🌎</span>
                      </div>
                      <div>
                        <p className="font-semibold">Real Impact</p>
                        <p className="text-sm opacity-90">
                          Solutions for local communities
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Why Join the FtC Residency?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              This isn&apos;t just another hackathon. It&apos;s an intensive
              program designed to create lasting impact in Latin America&apos;s
              financial ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Residency Benefits
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Free accommodation near Buenos Aires</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>All meals provided during the program</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Full access to workspace and facilities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Networking events and cultural activities</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                World-Class Mentorship
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>
                    Direct access to pioneers of Secure Communications,
                    Decentralized Identity, Confidential Compute, and Funding &
                    Governance
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Daily workshops and technical sessions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>1-on-1 project guidance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Post-residency support network</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <span className="text-3xl">🌍</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Real-World Impact
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Build for 45M+ Argentinians facing inflation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Partner with local communities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Deploy solutions with real users</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span>Shape the future of financial inclusion</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Program Overview */}
      <section
        id="program-overview"
        className="py-20 bg-gradient-to-br from-gray-50 to-white"
      >
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Program Structure
            </h2>
            <p className="text-xl text-gray-600">
              Three weeks of intensive building, learning, and collaboration
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
              <div className="bg-white rounded-xl p-6 shadow-lg pt-8">
                <div className="text-sm text-purple-600 font-semibold mb-2">
                  WEEK 1
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  Foundation & Team Formation
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Choose your focus area</li>
                  <li>• Form project teams</li>
                  <li>• Define project scope</li>
                  <li>• Initial mentorship sessions</li>
                  <li>• Local ecosystem immersion</li>
                </ul>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-600"></div>
              <div className="bg-white rounded-xl p-6 shadow-lg pt-8">
                <div className="text-sm text-purple-600 font-semibold mb-2">
                  WEEK 2
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  Intensive Development
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Daily stand-ups & check-ins</li>
                  <li>• Technical workshops</li>
                  <li>• Rapid prototyping</li>
                  <li>• User testing sessions</li>
                  <li>• Expert office hours</li>
                </ul>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-yellow-500"></div>
              <div className="bg-white rounded-xl p-6 shadow-lg pt-8">
                <div className="text-sm text-purple-600 font-semibold mb-2">
                  WEEK 3
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  Demo & Deployment
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Finalize implementations</li>
                  <li>• Prepare presentations</li>
                  <li>• Demo Day showcase</li>
                  <li>• Judge evaluations</li>
                  <li>• Awards ceremony</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-center text-gray-900">
              Choose Your Focus Area
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Link
                href="/events/funding-commons-residency-2025/about"
                className="group"
              >
                <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                      <span className="text-green-600 group-hover:text-white">
                        🔒
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      Secure Communications
                    </h4>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Censorship-resistant messaging and resilient infrastructure
                    for the open internet
                  </p>
                </div>
              </Link>

              <Link
                href="/events/funding-commons-residency-2025/about"
                className="group"
              >
                <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                      <span className="text-blue-600 group-hover:text-white">
                        🆔
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      Decentralized Identity
                    </h4>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Privacy-preserving identity systems and ZK-based credentials
                    for inclusion
                  </p>
                </div>
              </Link>

              <Link
                href="/events/funding-commons-residency-2025/about"
                className="group"
              >
                <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                      <span className="text-purple-600 group-hover:text-white">
                        🛡️
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      Confidential Compute
                    </h4>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Zero-knowledge proofs, MPC, FHE, and privacy-preserving
                    computation
                  </p>
                </div>
              </Link>

              <Link
                href="/events/funding-commons-residency-2025/about"
                className="group"
              >
                <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-pink-500 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-500 transition-colors">
                      <span className="text-pink-600 group-hover:text-white">
                        💎
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      Funding & Governance
                    </h4>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Sustainable funding mechanisms and privacy-preserving
                    governance systems
                  </p>
                </div>
              </Link>
            </div>
            <div className="text-center mt-6">
              <Link
                href="/events/funding-commons-residency-2025/about"
                className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
              >
                Learn more about focus areas
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mentors & Partners */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Learn from the Best
            </h2>
            <p className="text-xl text-gray-600">
              Industry leaders, researchers, and builders guiding your journey
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-12">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl text-white font-bold">15+</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Expert Mentors
                </h3>
                <p className="text-gray-600">
                  From leading protocols and research institutions
                </p>
              </div>

              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl text-white font-bold">50+</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Workshop Hours
                </h3>
                <p className="text-gray-600">
                  Technical deep-dives and hands-on sessions
                </p>
              </div>

              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-pink-500 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-4xl text-white font-bold">∞</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Network Access
                </h3>
                <p className="text-gray-600">
                  Lifetime connections in the ecosystem
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-700 mb-4">Previous mentors from:</p>
              <div className="flex flex-wrap justify-center gap-6 items-center opacity-70">
                <span className="text-gray-600 font-medium">Protocol Labs</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 font-medium">
                  Ethereum Foundation
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 font-medium">Polygon</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 font-medium">Chainlink</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 font-medium">Arweave</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 font-medium">Worldcoin</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Simple Application Process
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="relative">
              <div className="absolute top-8 left-1/2 w-full h-0.5 bg-gray-300 hidden md:block"></div>
              <div className="relative bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Create Account
                </h3>
                <p className="text-sm text-gray-600">
                  Quick sign-up with email or social login
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-8 left-1/2 w-full h-0.5 bg-gray-300 hidden md:block"></div>
              <div className="relative bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Fill Application
                </h3>
                <p className="text-sm text-gray-600">
                  Tell us about your background and interests
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-8 left-1/2 w-full h-0.5 bg-gray-300 hidden md:block"></div>
              <div className="relative bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Submit</h3>
                <p className="text-sm text-gray-600">
                  Review and submit your application
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="relative bg-green-50 border-2 border-green-500 rounded-xl p-6 shadow-lg text-center">
                <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  ✓
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Get Results
                </h3>
                <p className="text-sm text-gray-600">
                  Hear back within 2 weeks
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-8 border border-blue-200">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">
              What We&apos;re Looking For
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Essential Qualities
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span>
                      Strong technical skills in blockchain development
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span>
                      Passion for financial inclusion and social impact
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span>Ability to work collaboratively in teams</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span>Commitment to the full 3-week program</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Nice to Have
                </h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2 mt-1">•</span>
                    <span>
                      Experience with zero-knowledge proofs or cryptography
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2 mt-1">•</span>
                    <span>
                      Understanding of Latin American financial challenges
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2 mt-1">•</span>
                    <span>Spanish language skills (not required)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2 mt-1">•</span>
                    <span>Previous hackathon or residency experience</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Alumni Success Stories
            </h2>
            <p className="text-xl text-gray-600">
              Hear from past participants about their experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">AK</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Alex Kim</p>
                  <p className="text-sm text-gray-600">Protocol Engineer</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                &quot;The FtC residency was transformative. We built a
                remittance solution that&apos;s now processing over $100k
                monthly for families in Argentina. The mentorship and local
                connections were invaluable.&quot;
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Built: Cross-border payment protocol
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">MS</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Maria Santos</p>
                  <p className="text-sm text-gray-600">ZK Developer</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                &quot;Working alongside brilliant minds for three weeks in
                Buenos Aires accelerated my learning by years. Our identity
                solution is now being piloted by the city government.&quot;
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Built: Privacy-preserving ID system
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">JL</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">James Liu</p>
                  <p className="text-sm text-gray-600">DeFi Builder</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                &quot;The real-world focus made all the difference. We
                weren&apos;t just building in a vacuum - we were solving actual
                problems for real people. Post-residency support helped us
                secure funding.&quot;
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Built: Inflation-resistant savings protocol
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Do I need to know Spanish?
              </h3>
              <p className="text-gray-600">
                No, the program is conducted in English. However, basic Spanish
                can be helpful for daily life in Buenos Aires.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                What costs are covered?
              </h3>
              <p className="text-gray-600">
                We provide free accommodation and all meals during the
                residency. Travel costs to and from Buenos Aires are your
                responsibility.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I participate remotely?
              </h3>
              <p className="text-gray-600">
                No, this is an in-person residency. The collaborative
                environment and local immersion are core to the program&apos;s
                value.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens after the residency?
              </h3>
              <p className="text-gray-600">
                Top projects receive additional funding and incubation support.
                All participants join our alumni network with ongoing mentorship
                and opportunities.
              </p>
            </div>

            <div className="text-center mt-8">
              <Link
                href="/events/funding-commons-residency-2025/faq"
                className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
              >
                View all FAQs
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Build the Future of Finance?
          </h2>
          <p className="text-xl lg:text-2xl mb-8 opacity-95">
            Join 30 exceptional builders in Buenos Aires this October-November.
            Applications close October 1st, 2025.
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold mb-2">{spotsRemaining}</p>
                <p className="text-sm opacity-90">Spots Remaining</p>
              </div>
              <div>
                <p className="text-3xl font-bold mb-2">Oct 1</p>
                <p className="text-sm opacity-90">Application Deadline</p>
              </div>
              <div>
                <p className="text-3xl font-bold mb-2">Oct 24</p>
                <p className="text-sm opacity-90">Program Starts</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {session?.user ? (
              <Link
                href="/events/funding-commons-residency-2025?tab=application"
                className="bg-white text-blue-700 px-10 py-5 rounded-xl font-semibold hover:bg-yellow-300 hover:text-blue-900 transition-all duration-200 shadow-lg transform hover:scale-105 text-lg"
              >
                Complete Your Application →
              </Link>
            ) : (
              <Link
                href="/signin?callbackUrl=/events/funding-commons-residency-2025?tab=application"
                className="bg-white text-blue-700 px-10 py-5 rounded-xl font-semibold hover:bg-yellow-300 hover:text-blue-900 transition-all duration-200 shadow-lg transform hover:scale-105 text-lg"
              >
                Start Your Application →
              </Link>
            )}
            <Link
              href="https://www.fundingthecommons.io/builderresidency2025"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 text-white px-10 py-5 rounded-xl font-semibold hover:bg-blue-400/30 transition-colors text-lg"
            >
              Learn More
            </Link>
          </div>

          <p className="mt-8 text-sm opacity-75">
            Questions? Email us at {env.ADMIN_EMAIL}
          </p>
        </div>
      </section>
    </div>
  );
}
