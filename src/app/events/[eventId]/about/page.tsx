import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Residency Focus - Funding the Commons RealFi Residency 2025",
  description:
    "Explore the four key focus areas of the FtC RealFi Residency: Secure Communications, Decentralized Identity, Confidential Compute, and Funding & Governance",
};

export default function FundingCommonsResidencyAboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <nav className="text-sm breadcrumbs mb-6 opacity-90">
            <Link
              href="/events/funding-commons-residency-2025"
              className="hover:text-blue-200 transition-colors"
            >
              ← Back to Residency
            </Link>
          </nav>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6 leading-tight">
                Residency Focus Areas
              </h1>
              <p className="text-xl mb-8 leading-relaxed opacity-95">
                Four lenses for building real-world blockchain applications
              </p>
              <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-400 rounded-full p-2 mt-1">
                    <svg
                      className="w-5 h-5 text-yellow-900"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A.996.996 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.016 6l-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.723V12a1 1 0 11-2 0v-1.277l-1.246-.855a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.277l1.246.855a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.277V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-2">
                      Programming & Projects
                    </p>
                    <p className="opacity-95 leading-relaxed">
                      3 weeks of intensive collaboration on cutting-edge
                      projects across four key areas, with mentorship from
                      industry experts and hands-on development of real-world
                      applications.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-3xl transform rotate-6"></div>
                <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Secure Communications
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Decentralized Identity
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Confidential Compute
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Funding & Governance
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Programming Approach */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">
              Hands-On Development Approach
            </h2>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              The residency is structured around intensive project development
              with expert guidance and peer collaboration.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Week 1: Foundation
                </h3>
                <p className="text-gray-600 text-sm">
                  Choose your focus area, form teams, and establish project
                  scope with mentors
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 9.172V5L8 4z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Week 2: Build
                </h3>
                <p className="text-gray-600 text-sm">
                  Intensive development phase with daily check-ins and technical
                  workshops
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Week 3: Demo
                </h3>
                <p className="text-gray-600 text-sm">
                  Finalize implementations, prepare demos, and present to judges
                  and community
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Focus Areas Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Secure Communications */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-lg p-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Secure Communications
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Censorship-resistant communication</strong> —
                  protocols for unstoppable, secure messaging across borders.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>
                    Resilient infrastructure for the open internet
                  </strong>{" "}
                  — integrations with Tor, Nym, and new anti-censorship layers.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Digital sovereignty tooling</strong> — ensuring
                  communities can coordinate outside centralized choke points.
                </p>
              </div>
            </div>
          </div>

          {/* Decentralized Identity */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-lg p-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Decentralized Identity
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Decentralized identity systems</strong> — resilient,
                  non-extractive DIDs for refugees, activists, and communities.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>ZK-based attestations & credentials</strong> — proofs
                  of membership, reputation, or contribution without revealing
                  sensitive data.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Cross-ecosystem identity bridges</strong> —
                  interoperable standards that let users move between ecosystems
                  without re-identification risk.
                </p>
              </div>
            </div>
          </div>

          {/* Confidential Compute */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-lg p-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Confidential Compute
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Zero-knowledge proof systems</strong> — advancing
                  efficiency, scalability, and new applied use cases (identity,
                  voting, L2 privacy).
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>New cryptographic primitives</strong> — threshold
                  encryption, homomorphic commitments, post-quantum crypto.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Confidential compute platforms</strong> — MPC, FHE,
                  TEEs, and hybrid approaches for privacy-preserving computation
                  and AI.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Applied privacy for AI</strong> — integrating ZK, FHE,
                  or MPC into machine learning and inference workflows.
                </p>
              </div>
            </div>
          </div>

          {/* Funding & Governance */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-lg p-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Funding & Governance
                </h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Privacy-preserving governance</strong> —
                  decision-making systems that protect user anonymity and resist
                  coercion.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Sustainable funding for public goods</strong> —
                  quadratic funding, retroPGF, bonding curves, hypercerts, etc.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Global payments & remittances for the commons</strong>{" "}
                  — stablecoin rails and payout infrastructure for underserved
                  communities.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700">
                  <strong>Bitcoin governance experiments</strong> — enabling BTC
                  holders to participate in funding/voting via Ethereum or other
                  programmable layers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Example Projects */}
        <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-100 mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-900">
            Example Project Types
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Off-Ramp Solutions
                </h3>
                <p className="text-gray-600 text-sm">
                  Build user-friendly crypto-to-peso conversion systems
                  integrated with local payment networks
                </p>
              </div>
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Identity Verification
                </h3>
                <p className="text-gray-600 text-sm">
                  Develop privacy-preserving KYC solutions using zero-knowledge
                  proofs for financial inclusion
                </p>
              </div>
              <div className="border-l-4 border-purple-500 pl-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Private Voting Systems
                </h3>
                <p className="text-gray-600 text-sm">
                  Create coercion-resistant governance mechanisms for
                  cooperatives and community organizations
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="border-l-4 border-pink-500 pl-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Micro-Credit Platforms
                </h3>
                <p className="text-gray-600 text-sm">
                  Design transparent lending protocols with community-based
                  reputation systems
                </p>
              </div>
              <div className="border-l-4 border-indigo-500 pl-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Inflation-Resistant Savings
                </h3>
                <p className="text-gray-600 text-sm">
                  Build automated savings applications that protect against
                  currency devaluation
                </p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Censorship-Resistant Communication
                </h3>
                <p className="text-gray-600 text-sm">
                  Develop secure messaging platforms for activists and
                  journalists under authoritarian pressure
                </p>
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <p className="text-gray-600 italic">
              These are examples - we encourage innovative approaches to
              real-world problems
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Focus Your Impact?
          </h2>
          <p className="text-xl mb-8 opacity-95 max-w-3xl mx-auto leading-relaxed">
            Choose your focus area and dive deep into building solutions that
            matter. Work with like-minded builders, access specialized
            mentorship, and develop projects that address real-world challenges
            across these four critical domains.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/events/funding-commons-residency-2025?tab=application"
              className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Apply Now
            </Link>
            <Link
              href="/events/funding-commons-residency-2025/faq"
              className="bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-400/30 transition-colors"
            >
              View FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
