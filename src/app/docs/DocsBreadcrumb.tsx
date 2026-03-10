"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  "get-started": "GET STARTED",
  features: "FEATURES",
  organizers: "FOR ORGANIZERS",
  introduction: "Introduction",
  quickstart: "Quickstart",
  "your-account": "Your Account",
  overview: "Overview",
  events: "Events",
  applications: "Applications",
  schedule: "Schedule",
  "floor-management": "Floor Management",
  projects: "Projects",
  invitations: "Invitations",
  "admin-panel": "Admin Panel",
  "floor-owners": "Managing Floor Leads",
  "activity-certs": "Activity Certs",
  deliberation: "Deliberation",
};

export default function DocsBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname
    .split("/")
    .filter((s) => s && s !== "docs");

  if (segments.length === 0) return null;

  return (
    <div className="docs-breadcrumb">
      <Link href="/docs">Docs</Link>
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        const href = `/docs/${segments.slice(0, i + 1).join("/")}`;
        const label = labels[segment] ?? segment;

        return (
          <span key={segment}>
            <span className="docs-breadcrumb-separator">&rsaquo;</span>
            {isLast ? (
              <span className="docs-breadcrumb-current">{label}</span>
            ) : (
              <Link href={href}>{label}</Link>
            )}
          </span>
        );
      })}
    </div>
  );
}
