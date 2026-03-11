import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Testimonials - Funding the Commons Residency 2025",
  description:
    "Hear from past residents and participants of the Funding the Commons Residency program",
};

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  organization?: string;
  year: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "The Funding the Commons Residency transformed how I think about public goods funding. The intensive collaboration with experts and fellow builders gave me the tools and network to launch a project that's now serving thousands of users in emerging markets.",
    author: "Maria González",
    role: "Founder",
    organization: "DecentralPay",
    year: "2024",
  },
  {
    quote:
      "What struck me most was the quality of mentorship and the diversity of perspectives. Working alongside builders from different backgrounds and specializations pushed me to think beyond my own assumptions. The project we built during the residency became the foundation for our Series A fundraise.",
    author: "Jamal Osei",
    role: "Technical Lead",
    organization: "PrivacyDAO",
    year: "2024",
  },
  {
    quote:
      "I came to the residency with an idea and left with a working prototype, a community of supporters, and partnerships that are still driving my work today. The three weeks were intense but incredibly rewarding.",
    author: "Yuki Tanaka",
    role: "Researcher",
    organization: "Tokyo Institute of Technology",
    year: "2023",
  },
  {
    quote:
      "The residency gave me space to experiment with ideas I'd been thinking about for years but never had the time or resources to pursue. The no-pressure environment combined with world-class mentorship was exactly what I needed to take my project to the next level.",
    author: "Alex Chen",
    role: "Independent Developer",
    year: "2023",
  },
  {
    quote:
      "Beyond the technical skills and project outcomes, the connections I made during the residency have been invaluable. I'm still collaborating with people I met there, and we continue to support each other's work in the public goods space.",
    author: "Sofia Petrov",
    role: "Product Manager",
    organization: "Commons Protocol",
    year: "2024",
  },
  {
    quote:
      "As someone working on privacy-preserving technologies, finding a community that truly understands both the technical challenges and the social impact was transformative. The residency brought together the right people at the right time.",
    author: "Rashid Ahmed",
    role: "Cryptography Engineer",
    organization: "ZK Labs",
    year: "2023",
  },
];

export default function TestimonialsPage() {
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

          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Testimonials
            </h1>
            <p className="text-xl mb-4 leading-relaxed opacity-95 max-w-3xl mx-auto">
              Hear from past residents and participants who have experienced the
              Funding the Commons Residency
            </p>
            <div className="flex items-center justify-center gap-8 mt-8">
              <div className="text-center">
                <div className="text-4xl font-bold">150+</div>
                <div className="text-sm opacity-90">Alumni</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">40+</div>
                <div className="text-sm opacity-90">Projects Launched</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">3</div>
                <div className="text-sm opacity-90">Years Running</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Grid */}
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100"
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <svg
                  className="w-10 h-10 text-blue-500 opacity-50"
                  fill="currentColor"
                  viewBox="0 0 32 32"
                >
                  <path d="M10 8c-3.314 0-6 2.686-6 6s2.686 6 6 6c1.657 0 3.157-.672 4.243-1.757C13.533 20.654 11.467 22 9 22c-0.552 0-1 0.448-1 1s0.448 1 1 1c4.411 0 8-3.589 8-8V8H10zM24 8c-3.314 0-6 2.686-6 6s2.686 6 6 6c1.657 0 3.157-.672 4.243-1.757C27.533 20.654 25.467 22 23 22c-0.552 0-1 0.448-1 1s0.448 1 1 1c4.411 0 8-3.589 8-8V8H24z" />
                </svg>
              </div>

              {/* Quote Text */}
              <p className="text-gray-700 text-lg leading-relaxed mb-6 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Author Info */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 text-lg">
                      {testimonial.author}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {testimonial.role}
                      {testimonial.organization && (
                        <> • {testimonial.organization}</>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                    {testimonial.year}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Impact Section */}
        <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-100 mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-900">
            What Our Alumni Are Building
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                Privacy Infrastructure
              </h3>
              <p className="text-gray-600 text-sm">
                Zero-knowledge proof systems, secure messaging platforms, and
                confidential compute solutions
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                Decentralized Identity
              </h3>
              <p className="text-gray-600 text-sm">
                DID systems, credential platforms, and privacy-preserving
                reputation mechanisms
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                Public Goods Funding
              </h3>
              <p className="text-gray-600 text-sm">
                Quadratic funding platforms, retroactive public goods funding,
                and governance systems
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-6">Join Our Community</h2>
          <p className="text-xl mb-8 opacity-95 max-w-3xl mx-auto leading-relaxed">
            Be part of the next cohort building the future of public goods
            funding. Applications are now open for the 2025 residency program.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/events/funding-commons-residency-2025"
              className="bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Apply Now
            </Link>
            <Link
              href="/events/funding-commons-residency-2025/about"
              className="bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-400/30 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
