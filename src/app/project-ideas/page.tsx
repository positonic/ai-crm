import { ProjectIdeasClient } from "./ProjectIdeasClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Ideas | Funding the Commons",
  description:
    "Explore innovative blockchain and crypto project ideas from our community. Find your next build or contribute to the ecosystem.",
  openGraph: {
    title: "Project Ideas | Funding the Commons",
    description:
      "Explore innovative blockchain and crypto project ideas from our community.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Ideas | Funding the Commons",
    description:
      "Explore innovative blockchain and crypto project ideas from our community.",
  },
};

export default function ProjectIdeasPage() {
  return <ProjectIdeasClient />;
}
