import {
  IconRocket,
  IconTrophy,
  IconUsersGroup,
  IconCalendarEvent,
  IconBrain,
  IconUmbrella,
} from "@tabler/icons-react";

/** Canonical icon mapping for event cards */
export function getEventCardIcon(type: string) {
  switch (type.toUpperCase()) {
    case "EIR":
    case "RESIDENCY":
    case "COLIVING":
      return IconRocket;
    case "HACKATHON":
      return IconTrophy;
    case "CONFERENCE":
      return IconUsersGroup;
    case "DINNER":
      return IconCalendarEvent;
    case "WORKSHOP":
      return IconBrain;
    default:
      return IconUmbrella;
  }
}

/** Canonical Mantine gradient mapping for event cards */
export function getEventCardGradient(type: string): {
  from: string;
  to: string;
} {
  switch (type.toUpperCase()) {
    case "EIR":
    case "RESIDENCY":
    case "COLIVING":
      return { from: "blue", to: "cyan" };
    case "HACKATHON":
      return { from: "orange", to: "red" };
    case "CONFERENCE":
      return { from: "green", to: "teal" };
    case "DINNER":
      return { from: "violet", to: "indigo" };
    case "WORKSHOP":
      return { from: "teal", to: "cyan" };
    default:
      return { from: "purple", to: "pink" };
  }
}

/** Format a date for event card display */
export function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Compute temporal status (Open/Soon/Past) for an event */
export function getTemporalStatus(
  startDate: Date,
  endDate: Date,
): { label: string; color: string } {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now >= start && now <= end) {
    return { label: "Open", color: "green" };
  } else if (start > now) {
    return { label: "Soon", color: "blue" };
  } else {
    return { label: "Past", color: "gray" };
  }
}
