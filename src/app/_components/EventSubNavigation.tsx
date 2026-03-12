"use client";

import {
  IconMapPin,
  IconHeart,
  IconNews,
  IconHandStop,
  IconUsers,
  IconBulb,
  IconCalendarEvent,
  IconSettings,
  IconMicrophone,
  IconSparkles,
  IconBuilding,
  IconClipboardList,
  IconUserCheck,
  IconExternalLink,
  IconFileText,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Text, Group } from "@mantine/core";
import { api } from "~/trpc/react";
import { NavigationContainer } from "./nav/NavigationContainer";
import { NavigationTabs } from "./nav/NavigationTabs";
import { NavigationTab } from "./nav/NavigationTab";
import { SubNavigationHeader } from "./nav/SubNavigationHeader";
import { normalizeEventType } from "~/types/event";

interface EventSubNavigationProps {
  eventId: string;
  eventName?: string;
  eventType?: string;
  featureFlags?: {
    featureAsksOffers: boolean;
    featureProjects: boolean;
    featureNewsfeed: boolean;
    featureImpactAnalytics: boolean;
    featurePraise?: boolean;
    featureScheduleManagement?: boolean;
    featureSpeakerVetting?: boolean;
    featureApplicantVetting?: boolean;
    featureSponsorManagement?: boolean;
    featureMentorVetting?: boolean;
    featureFloorManagement?: boolean;
  };
  isFloorOwner?: boolean;
  isAdmin?: boolean;
  /** When provided, renders admin-specific tabs linking to admin sub-pages */
  adminBasePath?: string;
}

export default function EventSubNavigation({
  eventId,
  eventName,
  eventType,
  featureFlags,
  isFloorOwner,
  isAdmin,
  adminBasePath,
}: EventSubNavigationProps) {
  const pathname = usePathname();
  const basePath = `/events/${eventId}`;
  const isConference = normalizeEventType(eventType) === "CONFERENCE";
  const { data: session } = useSession();

  // Client-side fallback: only fires when server-side check missed floor lead status
  const shouldCheckClientSide =
    !isFloorOwner &&
    !isAdmin &&
    !!session?.user &&
    featureFlags?.featureScheduleManagement !== false;

  const { data: clientIsFloorOwner } = api.schedule.isFloorOwner.useQuery(
    { eventId },
    { enabled: shouldCheckClientSide },
  );

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const isEffectiveFloorOwner = isFloorOwner || clientIsFloorOwner === true;
  const showManageSchedule = isEffectiveFloorOwner || isAdmin;

  // --- Admin route: management tabs ---
  if (adminBasePath) {
    const getAdminActiveTab = () => {
      if (pathname.startsWith(`${adminBasePath}/applications`))
        return "applications";
      if (pathname.startsWith(`${adminBasePath}/floor-owners`))
        return "floor-owners";
      if (pathname.startsWith(`${adminBasePath}/mentors`)) return "mentors";
      if (pathname.startsWith(`${adminBasePath}/speakers`)) return "speakers";
      if (pathname.startsWith(`${adminBasePath}/sponsors`)) return "sponsors";
      if (pathname.startsWith(`${adminBasePath}/select-rubric`))
        return "select-rubric";
      if (pathname.startsWith(`${adminBasePath}/onboarding`))
        return "onboarding";
      if (pathname.startsWith(`${basePath}/schedule`)) return "schedule";
      if (pathname === adminBasePath || pathname === `${adminBasePath}/`)
        return "overview";
      return null;
    };

    return (
      <>
        {eventName && <SubNavigationHeader title={eventName} />}
        <NavigationContainer level="sub" withTopBorder={!eventName}>
          <Group justify="space-between" align="center" wrap="nowrap">
            <NavigationTabs activeTab={getAdminActiveTab()} level="sub">
              <NavigationTab
                value="overview"
                href={adminBasePath}
                icon={<IconSettings size={16} />}
                level="sub"
              >
                Overview
              </NavigationTab>

              {featureFlags?.featureApplicantVetting !== false && (
                <NavigationTab
                  value="applications"
                  href={`${adminBasePath}/applications`}
                  icon={<IconUsers size={16} />}
                  level="sub"
                >
                  Applications
                </NavigationTab>
              )}

              {featureFlags?.featureFloorManagement !== false && (
                <NavigationTab
                  value="floor-owners"
                  href={`${adminBasePath}/floor-owners`}
                  icon={<IconBuilding size={16} />}
                  level="sub"
                >
                  Floor Leads
                </NavigationTab>
              )}

              {featureFlags?.featureMentorVetting !== false && (
                <NavigationTab
                  value="mentors"
                  href={`${adminBasePath}/mentors`}
                  icon={<IconUserCheck size={16} />}
                  level="sub"
                >
                  Mentors
                </NavigationTab>
              )}

              {featureFlags?.featureSpeakerVetting !== false && (
                <NavigationTab
                  value="speakers"
                  href={`${adminBasePath}/speakers`}
                  icon={<IconMicrophone size={16} />}
                  level="sub"
                >
                  Speakers
                </NavigationTab>
              )}

              {featureFlags?.featureSponsorManagement !== false && (
                <NavigationTab
                  value="sponsors"
                  href={`${adminBasePath}/sponsors`}
                  icon={<IconBuilding size={16} />}
                  level="sub"
                >
                  Sponsors
                </NavigationTab>
              )}

              {featureFlags?.featureApplicantVetting !== false && (
                <NavigationTab
                  value="select-rubric"
                  href={`${adminBasePath}/select-rubric`}
                  icon={<IconClipboardList size={16} />}
                  level="sub"
                >
                  Selection Rubric
                </NavigationTab>
              )}

              <NavigationTab
                value="schedule"
                href={`${basePath}/schedule`}
                icon={<IconCalendarEvent size={16} />}
                level="sub"
              >
                Schedule
              </NavigationTab>

              {featureFlags?.featureScheduleManagement !== false && (
                <NavigationTab
                  value="manage-schedule"
                  href={`${basePath}/manage-schedule`}
                  icon={<IconSettings size={16} />}
                  level="sub"
                >
                  Manage Schedule
                </NavigationTab>
              )}
            </NavigationTabs>

            <Link
              href={basePath}
              style={{
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <Group gap={4}>
                <Text size="xs" c="dimmed">
                  View as participant
                </Text>
                <IconExternalLink size={14} style={{ opacity: 0.5 }} />
              </Group>
            </Link>
          </Group>
        </NavigationContainer>
      </>
    );
  }

  // --- User route: participant tabs ---
  const getActiveTab = () => {
    const match = /^\/events\/[^/]+(\/.*)?$/.exec(pathname);
    const subPath = match?.[1] ?? "";
    if (subPath.startsWith("/apply")) return "apply";
    if (subPath.startsWith("/speakers")) return "speakers";
    if (subPath.startsWith("/manage-schedule")) return "manage-schedule";
    if (subPath.startsWith("/schedule")) return "schedule";
    if (subPath.startsWith("/impact")) return "impact";
    if (subPath.startsWith("/latest")) return "latest";
    if (subPath.startsWith("/praise")) return "praise";
    if (subPath.startsWith("/asks-offers")) return "asks-offers";
    if (subPath.startsWith("/participants")) return "participants";
    if (subPath.startsWith("/projects")) return "event-projects";
    if (subPath.startsWith("/transcriptions")) return "transcriptions";
    if (subPath === "" || subPath === "/") return "dashboard";
    return null;
  };

  return (
    <>
      {eventName && <SubNavigationHeader title={eventName} />}
      <NavigationContainer level="sub" withTopBorder={!eventName}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <NavigationTabs activeTab={getActiveTab()} level="sub">
            {session?.user && (
              <NavigationTab
                value="dashboard"
                href={basePath}
                icon={<IconMapPin size={16} />}
                level="sub"
              >
                Dashboard
              </NavigationTab>
            )}

            {session?.user && (
              <NavigationTab
                value="apply"
                href={`${basePath}/apply`}
                icon={<IconClipboardList size={16} />}
                level="sub"
              >
                Apply
              </NavigationTab>
            )}

            {showManageSchedule && (
              <NavigationTab
                value="manage-schedule"
                href={`${basePath}/manage-schedule`}
                icon={<IconSettings size={16} />}
                level="sub"
              >
                Manage Floor Schedule
              </NavigationTab>
            )}

            <NavigationTab
              value="schedule"
              href={`${basePath}/schedule`}
              icon={<IconCalendarEvent size={16} />}
              level="sub"
            >
              Schedule
            </NavigationTab>

            {!isConference && featureFlags?.featureNewsfeed !== false && (
              <NavigationTab
                value="latest"
                href={`${basePath}/latest`}
                icon={<IconNews size={16} />}
                level="sub"
              >
                Latest
              </NavigationTab>
            )}

            {featureFlags?.featureAsksOffers !== false && (
              <NavigationTab
                value="asks-offers"
                href={`${basePath}/asks-offers`}
                icon={<IconHandStop size={16} />}
                level="sub"
              >
                Asks & Offers
              </NavigationTab>
            )}

            {!isConference && (
              <NavigationTab
                value="participants"
                href={`${basePath}/participants`}
                icon={<IconUsers size={16} />}
                level="sub"
              >
                Participants
              </NavigationTab>
            )}

            {featureFlags?.featureProjects !== false && (
              <NavigationTab
                value="event-projects"
                href={`${basePath}/projects`}
                icon={<IconBulb size={16} />}
                level="sub"
              >
                Projects
              </NavigationTab>
            )}

            {featureFlags?.featurePraise !== false && (
              <NavigationTab
                value="praise"
                href={`${basePath}/praise`}
                icon={<IconSparkles size={16} />}
                level="sub"
              >
                Praise
              </NavigationTab>
            )}

            {featureFlags?.featureImpactAnalytics !== false && (
              <NavigationTab
                value="impact"
                href={`${basePath}/impact`}
                icon={<IconHeart size={16} />}
                level="sub"
              >
                Impact
              </NavigationTab>
            )}

            {showManageSchedule &&
              featureFlags?.featureSpeakerVetting !== false && (
                <NavigationTab
                  value="speakers"
                  href={`${basePath}/speakers`}
                  icon={<IconMicrophone size={16} />}
                  level="sub"
                >
                  Speakers
                </NavigationTab>
              )}

            {showManageSchedule && (
              <NavigationTab
                value="transcriptions"
                href={`${basePath}/transcriptions`}
                icon={<IconFileText size={16} />}
                level="sub"
              >
                Transcriptions
              </NavigationTab>
            )}
          </NavigationTabs>

          {isAdmin && (
            <Link
              href={`/admin/events/${eventId}`}
              style={{
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <Group gap={4}>
                <Text size="xs" c="dimmed">
                  Manage event
                </Text>
                <IconExternalLink size={14} style={{ opacity: 0.5 }} />
              </Group>
            </Link>
          )}
        </Group>
      </NavigationContainer>
    </>
  );
}
