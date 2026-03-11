"use client";

import {
  ResidencyImpactReport,
  type ResidencyReportConfig,
} from "~/app/_components/ResidencyImpactReport";

const config: ResidencyReportConfig = {
  // Core identifiers
  eventId: "ftc-residency-chiang-mai",
  eventSlug: "ftc-residency-chiang-mai",

  // Header content
  title: "Funding the Commons",
  subtitle: "Residency Chiang Mai",
  location: "Chiang Mai",
  dateRange: "TBD 2025",

  // Stats - placeholder values to be updated
  residentCount: "TBD",
  projectCount: "TBD",

  // Program details
  description:
    "An intensive residency program bringing together builders, researchers, and funders to develop projects advancing public goods funding, web3 infrastructure, and decentralized governance. Set in Chiang Mai, Thailand, the program fosters collaboration, learning, and meaningful impact in the Funding the Commons ecosystem.",

  programHighlights: [
    "Multi-week intensive residency program",
    "Chiang Mai, Thailand",
    "Hands-on project development and mentorship",
  ],

  keyOutcomes: [
    "Projects actively developed during residency",
    "Impact metrics implementation",
    "Project updates documenting progress and learnings",
    "Community engagement and collaboration",
    "Asks & offers facilitating resident collaboration",
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

  // Participant profile - placeholder values
  participantProfile: {
    countries: "TBD",
    topCountries: "Top countries to be determined",
    regionBreakdown: [
      { label: "Asia", percentage: "TBD", color: "green" },
      { label: "Global", percentage: "TBD", color: "gray" },
    ],
    roleBreakdown: [
      { label: "Developers", percentage: "TBD", color: "blue" },
      { label: "Entrepreneurs", percentage: "TBD", color: "violet" },
      { label: "Academics", percentage: "TBD", color: "teal" },
    ],
    technicalFocus: [
      { label: "Web3 & Blockchain", color: "teal" },
      { label: "Public Goods", color: "cyan" },
      { label: "DeFi & Finance", color: "indigo" },
    ],
  },

  // Engagement stats - undefined for upcoming event, will show TBD in UI
  engagementStats: undefined,
};

export default function FtcResidencyChiangMaiReport() {
  return <ResidencyImpactReport config={config} />;
}
