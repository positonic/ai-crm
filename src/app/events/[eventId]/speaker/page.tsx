import { redirect } from "next/navigation";

interface SpeakerRedirectProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Backward-compatibility redirect: /events/[eventId]/speaker → /events/[eventId]/apply
 */
export default async function SpeakerRedirectPage({
  params,
  searchParams,
}: SpeakerRedirectProps) {
  const { eventId } = await params;
  const search = await searchParams;

  const queryString = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (typeof value === "string") {
      queryString.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        queryString.append(key, v);
      }
    }
  });

  const qs = queryString.toString();
  redirect(`/events/${eventId}/apply${qs ? `?${qs}` : ""}`);
}
