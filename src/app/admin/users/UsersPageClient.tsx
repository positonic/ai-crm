"use client";

import { useState, useEffect } from "react";
import { Tabs, Container } from "@mantine/core";
import {
  IconUsers,
  IconUserCircle,
  IconMail,
  IconMailOpened,
} from "@tabler/icons-react";
import UsersClient from "./UsersClient";
import ProfilesAdminClient from "./ProfilesAdminClient";
import InvitationsClient from "./InvitationsClient";
import { CommunicationsClient } from "../communications/CommunicationsClient";

const VALID_TABS = ["management", "profiles", "invitations", "communications"];

export default function UsersPageClient() {
  const [activeTab, setActiveTab] = useState<string>("management");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && VALID_TABS.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      window.history.replaceState(null, "", `#${value}`);
    }
  };

  return (
    <Container size="xl" py="md">
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List mb="md">
          <Tabs.Tab value="management" leftSection={<IconUsers size={16} />}>
            Management
          </Tabs.Tab>
          <Tabs.Tab value="profiles" leftSection={<IconUserCircle size={16} />}>
            Profiles
          </Tabs.Tab>
          <Tabs.Tab value="invitations" leftSection={<IconMail size={16} />}>
            Invitations
          </Tabs.Tab>
          <Tabs.Tab
            value="communications"
            leftSection={<IconMailOpened size={16} />}
          >
            Communications
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="management">
          {activeTab === "management" && <UsersClient />}
        </Tabs.Panel>

        <Tabs.Panel value="profiles">
          {activeTab === "profiles" && <ProfilesAdminClient />}
        </Tabs.Panel>

        <Tabs.Panel value="invitations">
          {activeTab === "invitations" && <InvitationsClient />}
        </Tabs.Panel>

        <Tabs.Panel value="communications">
          {activeTab === "communications" && <CommunicationsClient />}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
