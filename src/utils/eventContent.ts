import { type EventType, type EventContent } from "~/types/event";
import {
  IconHome,
  IconTrophy,
  IconMicrophone,
  type Icon,
} from "@tabler/icons-react";

export const EVENT_CONTENT_MAP: Record<EventType, EventContent> = {
  RESIDENCY: {
    name: "FtC RealFi Residency",
    shortDescription: "Buenos Aires 2025",
    applicationClosedMessage: {
      title: "Applications are Currently Closed",
      description:
        "Thank you for your interest in the Funding the Commons RealFi Residency. The application period has ended and we are no longer accepting new applications.",
      infoMessage:
        "Stay tuned for announcements about future residency programs and opportunities.",
    },
    branding: {
      colors: {
        primary: "blue",
        secondary: "purple",
        gradient: "from-blue-600 to-purple-600",
      },
      icon: "home",
    },
  },
  HACKATHON: {
    name: "FtC RealFi Hackathon",
    shortDescription: "Buenos Aires 2025",
    applicationClosedMessage: {
      title: "Hackathon Applications are Currently Closed",
      description:
        "Thank you for your interest in the Funding the Commons RealFi Hackathon. The registration period has ended and we are no longer accepting new participants.",
      infoMessage:
        "Follow us for updates on hackathon results and future events.",
    },
    branding: {
      colors: {
        primary: "orange",
        secondary: "red",
        gradient: "from-orange-600 to-red-600",
      },
      icon: "trophy",
    },
  },
  CONFERENCE: {
    name: "FtC Conference",
    shortDescription: "Conference Event",
    applicationClosedMessage: {
      title: "Speaker Applications are Currently Closed",
      description:
        "Thank you for your interest in speaking at this Funding the Commons conference. The speaker application period has ended.",
      infoMessage:
        "Stay tuned for announcements about the conference schedule and future speaking opportunities.",
    },
    branding: {
      colors: {
        primary: "teal",
        secondary: "cyan",
        gradient: "from-teal-600 to-cyan-600",
      },
      icon: "microphone",
    },
  },
};

export function getEventContent(eventType: EventType): EventContent {
  return EVENT_CONTENT_MAP[eventType];
}

export function getEventIcon(eventType: EventType): Icon {
  switch (eventType) {
    case "RESIDENCY":
      return IconHome;
    case "HACKATHON":
      return IconTrophy;
    case "CONFERENCE":
      return IconMicrophone;
    default:
      return IconMicrophone; // fallback
  }
}

export function getEventGradient(eventType: EventType): string {
  const content = getEventContent(eventType);
  return content.branding.colors.gradient;
}
