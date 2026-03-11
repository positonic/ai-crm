export type EventType = "RESIDENCY" | "HACKATHON" | "CONFERENCE";

/**
 * Normalizes a raw event type string to the UPPERCASE EventType
 * used consistently throughout the codebase.
 */
export function normalizeEventType(
  rawType: string | undefined | null,
): EventType | undefined {
  if (!rawType) return undefined;
  const upper = rawType.toUpperCase();
  if (upper === "RESIDENCY" || upper === "HACKATHON" || upper === "CONFERENCE")
    return upper;
  return undefined;
}

export interface EventContent {
  name: string;
  shortDescription: string;
  applicationClosedMessage: {
    title: string;
    description: string;
    infoMessage: string;
  };
  branding: {
    colors: {
      primary: string;
      secondary: string;
      gradient: string;
    };
    icon: string;
  };
}
