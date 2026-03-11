"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBell,
  IconCheckbox,
  IconNote,
  IconMail,
  IconPhone,
  IconChartBar,
  IconPlayerPlay,
  IconChevronDown,
  IconChevronRight,
  IconBuilding,
  IconUsers,
  IconCurrencyDollar,
  IconUser,
  IconApps,
  IconFolder,
  IconSearch,
  IconLayoutSidebar,
  IconUserPlus,
  IconCircleArrowUp,
  IconCommand,
  IconBrandTelegram,
} from "@tabler/icons-react";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  badge?: number;
  disabled?: boolean;
  active?: boolean;
  hasChevron?: boolean;
  dataType?: string;
}

function SidebarItem({
  icon,
  label,
  href,
  badge,
  disabled = false,
  active = false,
  hasChevron = false,
  dataType,
}: SidebarItemProps) {
  const className = `crm-sidebar-item ${active ? "crm-sidebar-item-active" : ""} ${disabled ? "crm-sidebar-item-disabled" : ""}`;

  const content = (
    <>
      <span className="crm-sidebar-item-icon">{icon}</span>
      <span className="crm-sidebar-item-label">{label}</span>
      {badge !== undefined && (
        <span className="crm-sidebar-item-badge">{badge}</span>
      )}
      {hasChevron && (
        <span className="crm-sidebar-item-chevron">
          <IconChevronRight size={14} />
        </span>
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} data-type={dataType}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} data-type={dataType}>
      {content}
    </div>
  );
}

export default function CRMSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <aside className="crm-sidebar">
      {/* Header */}
      <div className="crm-sidebar-header">
        <div className="crm-sidebar-workspace">
          <div className="crm-sidebar-workspace-avatar">F</div>
          <span className="crm-sidebar-workspace-name">
            Funding the Comm...
          </span>
          <IconChevronDown
            size={14}
            className="crm-sidebar-workspace-chevron"
          />
        </div>
        <div className="crm-sidebar-toggle">
          <IconLayoutSidebar size={18} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="crm-sidebar-quick-actions">
        <div className="crm-sidebar-quick-actions-left">
          <IconCommand size={14} />
          <span>Quick actions</span>
        </div>
        <div className="crm-sidebar-quick-actions-right">
          <span className="crm-sidebar-shortcut">⌘K</span>
          <IconSearch size={14} className="crm-sidebar-search-icon" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="crm-sidebar-nav">
        {/* Main Items */}
        <SidebarItem
          icon={<IconBell size={18} />}
          label="Notifications"
          disabled
        />
        <SidebarItem
          icon={<IconCheckbox size={18} />}
          label="Tasks"
          badge={3}
          disabled
        />
        <SidebarItem icon={<IconNote size={18} />} label="Notes" disabled />
        <SidebarItem icon={<IconMail size={18} />} label="Emails" disabled />
        <SidebarItem
          icon={<IconBrandTelegram size={18} />}
          label="Telegram"
          href="/crm/communicate"
          active={isActive("/crm/communicate")}
        />
        <SidebarItem icon={<IconPhone size={18} />} label="Calls" disabled />
        <SidebarItem
          icon={<IconChartBar size={18} />}
          label="Reports"
          disabled
        />
        <SidebarItem
          icon={<IconPlayerPlay size={18} />}
          label="Automations"
          hasChevron
          disabled
        />

        {/* Favorites Section */}
        <div className="crm-sidebar-section">
          <div className="crm-sidebar-section-header">
            <IconChevronDown
              size={12}
              className="crm-sidebar-section-chevron"
            />
            <span>Favorites</span>
          </div>
          <div className="crm-sidebar-section-content">
            <div className="crm-sidebar-section-empty">No favorites</div>
          </div>
        </div>

        {/* Records Section */}
        <div className="crm-sidebar-section">
          <div className="crm-sidebar-section-header">
            <IconChevronDown
              size={12}
              className="crm-sidebar-section-chevron"
            />
            <span>Records</span>
          </div>
          <div className="crm-sidebar-section-content">
            <SidebarItem
              icon={<IconBuilding size={18} />}
              label="Organizations"
              href="/crm/organizations"
              active={isActive("/crm/organizations")}
              dataType="organizations"
            />
            <SidebarItem
              icon={<IconUsers size={18} />}
              label="Contacts"
              href="/crm/contacts"
              active={isActive("/crm/contacts")}
              dataType="contacts"
            />
            <SidebarItem
              icon={<IconCurrencyDollar size={18} />}
              label="Deals"
              disabled
              dataType="deals"
            />
            <SidebarItem
              icon={<IconUser size={18} />}
              label="Users"
              disabled
              dataType="users"
            />
            <SidebarItem
              icon={<IconApps size={18} />}
              label="Workspaces"
              disabled
              dataType="workspaces"
            />
          </div>
        </div>

        {/* Lists Section */}
        <div className="crm-sidebar-section">
          <div className="crm-sidebar-section-header">
            <IconChevronDown
              size={12}
              className="crm-sidebar-section-chevron"
            />
            <span>Lists</span>
          </div>
          <div className="crm-sidebar-section-content">
            <SidebarItem
              icon={<IconFolder size={18} />}
              label="Builders"
              disabled
              dataType="list"
            />
            <SidebarItem
              icon={<IconSearch size={18} />}
              label="Recruiting"
              disabled
              dataType="list-search"
            />
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="crm-sidebar-footer">
        <div className="crm-sidebar-progress">
          <span>Getting started</span>
          <span>71%</span>
        </div>

        <div className="crm-sidebar-invite">
          <IconUserPlus size={18} />
          <span>Invite team members</span>
        </div>

        <div className="crm-sidebar-trial">
          <div className="crm-sidebar-trial-left">
            <IconCircleArrowUp size={18} />
            <span>4 days left on trial!</span>
          </div>
          <button className="crm-sidebar-trial-button">Keep Pro</button>
        </div>
      </div>
    </aside>
  );
}
