"use client";

import {
  ResidencyImpactReport,
  type ResidencyReportConfig,
} from "~/app/_components/ResidencyImpactReport";

const config: ResidencyReportConfig = {
  // Core identifiers
  eventId: "funding-commons-residency-2025",
  eventSlug: "funding-commons-residency-2025",

  // Header content
  title: "Funding the Commons",
  subtitle: "Residency 2025",
  location: "Buenos Aires",
  dateRange: "Oct 24 - Nov 14",

  // Stats
  residentCount: "33",
  projectCount: "42",

  // Program details
  description:
    "A three-week intensive residency program bringing together 33 builders, researchers, and funders to develop projects advancing public goods funding, web3 infrastructure, and decentralized governance. Set in Buenos Aires during October-November 2025, the program fostered collaboration, learning, and meaningful impact in the Funding the Commons ecosystem.",

  programHighlights: [
    "3-week intensive residency program",
    "Buenos Aires, Argentina (October 24 - November 14, 2025)",
    "Hands-on project development and mentorship",
  ],

  keyOutcomes: [
    "42 projects actively developed during residency",
    "43% of projects (18/42) implemented measurable impact metrics",
    "119 project updates documenting progress and learnings",
    "Strong community engagement with 77 likes across updates",
    "21 asks & offers facilitating resident collaboration",
  ],

  programStructure: [
    {
      phase: "Week 1: Foundation",
      description: "Onboarding, team formation, and project scoping",
      activities: [
        "Welcome sessions",
        "Mentor introductions",
        "Initial project pitches",
        "Workshop sessions",
      ],
    },
    {
      phase: "Week 2: Development",
      description: "Intensive building, collaboration, and iteration",
      activities: [
        "Daily standups",
        "Technical workshops",
        "One-on-one mentoring",
        "Mid-program check-ins",
      ],
    },
    {
      phase: "Week 3: Launch",
      description: "Finalization, presentations, and community showcase",
      activities: [
        "Project demos",
        "Impact measurement",
        "Community presentations",
        "Next steps planning",
      ],
    },
  ],

  // Participant profile
  participantProfile: {
    countries: "18",
    topCountries:
      "Top countries: USA (4), Ireland (2), Argentina (2), Bolivia (2)",
    regionBreakdown: [
      { label: "LATAM", percentage: "27%", color: "green" },
      { label: "Global", percentage: "73%", color: "gray" },
    ],
    roleBreakdown: [
      { label: "Developers", percentage: "47%", color: "blue" },
      { label: "Entrepreneurs", percentage: "23%", color: "violet" },
      { label: "Academics", percentage: "13%", color: "teal" },
    ],
    technicalFocus: [
      { label: "Web3 & Blockchain", color: "teal" },
      { label: "Public Goods", color: "cyan" },
      { label: "DeFi & Finance", color: "indigo" },
    ],
  },

  // Engagement stats
  engagementStats: {
    metricsTrackingPercentage: "43%",
    projectsWithMetrics: "18 out of 42",
    totalDataPoints: "92",
    avgMetricsPerProject: "5.1",
    totalUpdates: "119",
    totalLikes: "77",
    asksOffers: "21",
    updatesPerProject: "2.8",
    totalCommunications: "476",
  },
};

export default function FundingCommonsResidency2025Report() {
  return <ResidencyImpactReport config={config} />;
}
