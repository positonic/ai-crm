import { notFound } from "next/navigation";
import SponsorResidencyDashboard from "./SponsorResidencyDashboard";
import { api } from "~/trpc/server";

interface SponsorResidencyPageProps {
  params: Promise<{
    sponsorId: string;
  }>;
  searchParams: Promise<{
    eventId?: string;
  }>;
}

export default async function SponsorResidencyPage({
  params,
  searchParams,
}: SponsorResidencyPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // For now, use a default event ID. In production, this would be passed via searchParams
  const eventId = resolvedSearchParams.eventId ?? "realfi-hackathon-2025";

  try {
    // Get the event sponsor relationship
    const event = await api.event.getEvent({ id: eventId });
    const eventSponsor = event?.sponsors.find(
      (es) => es.sponsor.id === resolvedParams.sponsorId,
    );

    if (!eventSponsor) {
      notFound();
    }

    return (
      <SponsorResidencyDashboard
        eventSponsorId={eventSponsor.id}
        sponsorId={resolvedParams.sponsorId}
        eventId={eventId}
      />
    );
  } catch (error) {
    console.error("Error loading sponsor residency page:", error);
    notFound();
  }
}
