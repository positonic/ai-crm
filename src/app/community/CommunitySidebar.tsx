"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHandStop, IconNews, IconMessages } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
  active?: boolean;
}

function SidebarItem({
  icon,
  label,
  href,
  badge,
  active = false,
}: SidebarItemProps) {
  const className = `community-sidebar-item ${active ? "community-sidebar-item-active" : ""}`;

  return (
    <Link href={href} className={className}>
      <span className="community-sidebar-item-icon">{icon}</span>
      <span className="community-sidebar-item-label">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="community-sidebar-item-badge">{badge}</span>
      )}
    </Link>
  );
}

export default function CommunitySidebar() {
  const pathname = usePathname();

  // Fetch counts for badges
  const { data: asksData = [] } = api.askOffer.getAllAsksOffers.useQuery({
    type: "ASK",
    onlyActive: true,
  });

  const { data: offersData = [] } = api.askOffer.getAllAsksOffers.useQuery({
    type: "OFFER",
    onlyActive: true,
  });

  const { data: updates } = api.project.getAllUpdates.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  const { data: forumCount = 0 } = api.forum.getThreadCount.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  );

  const asksOffersCount = asksData.length + offersData.length;
  const updatesCount = updates?.length ?? 0;

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <aside className="community-sidebar">
      {/* Header */}
      <div className="community-sidebar-header">
        <h1 className="community-sidebar-title">Community</h1>
        <p className="community-sidebar-subtitle">
          Stay connected with the community
        </p>
      </div>

      {/* Navigation */}
      <nav className="community-sidebar-nav">
        <SidebarItem
          icon={<IconHandStop size={20} />}
          label="Asks & Offers"
          href="/community/asks-offers"
          badge={asksOffersCount}
          active={isActive("/community/asks-offers")}
        />
        <SidebarItem
          icon={<IconNews size={20} />}
          label="Updates"
          href="/community/updates"
          badge={updatesCount}
          active={isActive("/community/updates")}
        />
        <SidebarItem
          icon={<IconMessages size={20} />}
          label="Forum"
          href="/community/forum"
          badge={forumCount}
          active={isActive("/community/forum")}
        />
      </nav>
    </aside>
  );
}
