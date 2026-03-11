"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBook,
  IconRocket,
  IconUser,
  IconApps,
  IconCalendarEvent,
  IconFileText,
  IconClock,
  IconBuilding,
  IconFolder,
  IconMail,
  IconSettings,
  IconUsers,
  IconCertificate,
  IconWorldSearch,
  IconTarget,
  IconBrain,
} from "@tabler/icons-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

function SidebarItem({ icon, label, href, active = false }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`docs-sidebar-item ${active ? "docs-sidebar-item-active" : ""}`}
    >
      <span className="docs-sidebar-item-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function DocsSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <aside className="docs-sidebar">
      <div className="docs-sidebar-header">
        <Link href="/docs" className="docs-sidebar-logo">
          <div className="docs-sidebar-logo-icon">IE</div>
          <span className="docs-sidebar-logo-text">Docs</span>
        </Link>
        <div className="docs-sidebar-subtitle">Impactful Events</div>
      </div>

      <nav className="docs-sidebar-nav">
        {/* Get Started */}
        <div className="docs-sidebar-section">
          <div className="docs-sidebar-section-header">Get Started</div>
          <SidebarItem
            icon={<IconBook size={18} />}
            label="Introduction"
            href="/docs/get-started/introduction"
            active={
              isActive("/docs/get-started/introduction") || pathname === "/docs"
            }
          />
          <SidebarItem
            icon={<IconRocket size={18} />}
            label="Quickstart"
            href="/docs/get-started/quickstart"
            active={isActive("/docs/get-started/quickstart")}
          />
          <SidebarItem
            icon={<IconUser size={18} />}
            label="Your Account"
            href="/docs/get-started/your-account"
            active={isActive("/docs/get-started/your-account")}
          />
        </div>

        {/* Features */}
        <div className="docs-sidebar-section">
          <div className="docs-sidebar-section-header">Features</div>
          <SidebarItem
            icon={<IconApps size={18} />}
            label="Overview"
            href="/docs/features/overview"
            active={isActive("/docs/features/overview")}
          />
          <SidebarItem
            icon={<IconCalendarEvent size={18} />}
            label="Events"
            href="/docs/features/events"
            active={isActive("/docs/features/events")}
          />
          <SidebarItem
            icon={<IconFileText size={18} />}
            label="Applications"
            href="/docs/features/applications"
            active={isActive("/docs/features/applications")}
          />
          <SidebarItem
            icon={<IconClock size={18} />}
            label="Schedule"
            href="/docs/features/schedule"
            active={isActive("/docs/features/schedule")}
          />
          <SidebarItem
            icon={<IconBuilding size={18} />}
            label="Floor Management"
            href="/docs/features/floor-management"
            active={isActive("/docs/features/floor-management")}
          />
          <SidebarItem
            icon={<IconFolder size={18} />}
            label="Projects"
            href="/docs/features/projects"
            active={isActive("/docs/features/projects")}
          />
          <SidebarItem
            icon={<IconMail size={18} />}
            label="Invitations"
            href="/docs/features/invitations"
            active={isActive("/docs/features/invitations")}
          />
          <SidebarItem
            icon={<IconCertificate size={18} />}
            label="Activity Certs"
            href="/docs/features/activity-certs"
            active={isActive("/docs/features/activity-certs")}
          />
          <SidebarItem
            icon={<IconTarget size={18} />}
            label="Deliberation"
            href="/docs/features/deliberation"
            active={isActive("/docs/features/deliberation")}
          />
          <SidebarItem
            icon={<IconBrain size={18} />}
            label="Conference Intelligence"
            href="/docs/features/conference-intelligence"
            active={isActive("/docs/features/conference-intelligence")}
          />
          <SidebarItem
            icon={<IconWorldSearch size={18} />}
            label="Hypersphere"
            href="/docs/features/hypersphere"
            active={isActive("/docs/features/hypersphere")}
          />
        </div>

        {/* For Organizers */}
        <div className="docs-sidebar-section">
          <div className="docs-sidebar-section-header">For Organizers</div>
          <SidebarItem
            icon={<IconSettings size={18} />}
            label="Admin Panel"
            href="/docs/organizers/admin-panel"
            active={isActive("/docs/organizers/admin-panel")}
          />
          <SidebarItem
            icon={<IconUsers size={18} />}
            label="Managing Floor Leads"
            href="/docs/organizers/floor-owners"
            active={isActive("/docs/organizers/floor-owners")}
          />
        </div>
      </nav>
    </aside>
  );
}
