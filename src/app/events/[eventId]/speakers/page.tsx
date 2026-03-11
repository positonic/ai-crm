import type { Metadata } from "next";
import SpeakerManagementClient from "./SpeakerManagementClient";

export const metadata: Metadata = {
  title: "Speaker Management",
  description: "Manage speaker invitations and applications",
};

interface SpeakerManagementPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function SpeakerManagementPage({
  params,
}: SpeakerManagementPageProps) {
  const { eventId } = await params;
  return <SpeakerManagementClient eventId={eventId} />;
}
