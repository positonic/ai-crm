/**
 * ICS (iCalendar) file generation utility for conference session calendar invites.
 * Generates RFC 5545 compliant VCALENDAR strings with METHOD:REQUEST.
 */

export interface IcsEventParams {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizerEmail?: string;
  attendeeEmail?: string;
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generateIcsEvent(params: IcsEventParams): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FundingTheCommons//SessionSchedule//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}@fundingthecommons.io`,
    `DTSTAMP:${formatDateUTC(new Date())}`,
    `DTSTART:${formatDateUTC(params.startTime)}`,
    `DTEND:${formatDateUTC(params.endTime)}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
  ];

  if (params.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(params.description)}`);
  }

  if (params.location) {
    lines.push(`LOCATION:${escapeIcsText(params.location)}`);
  }

  if (params.organizerEmail) {
    lines.push(`ORGANIZER:mailto:${params.organizerEmail}`);
  }

  if (params.attendeeEmail) {
    lines.push(`ATTENDEE;RSVP=FALSE;PARTSTAT=ACCEPTED:mailto:${params.attendeeEmail}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

/**
 * Generate a Google Calendar "Add Event" URL.
 */
export function generateGoogleCalendarUrl(params: IcsEventParams): string {
  const fmt = (d: Date) => formatDateUTC(d).replace(/[-:]/g, "");
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.summary);
  url.searchParams.set("dates", `${fmt(params.startTime)}/${fmt(params.endTime)}`);
  if (params.location) url.searchParams.set("location", params.location);
  if (params.description) url.searchParams.set("details", params.description);
  return url.toString();
}

/**
 * Generate an Outlook.com "Add Event" URL.
 */
export function generateOutlookCalendarUrl(params: IcsEventParams): string {
  const url = new URL("https://outlook.live.com/calendar/0/action/compose");
  url.searchParams.set("rru", "addevent");
  url.searchParams.set("subject", params.summary);
  url.searchParams.set("startdt", params.startTime.toISOString());
  url.searchParams.set("enddt", params.endTime.toISOString());
  if (params.location) url.searchParams.set("location", params.location);
  if (params.description) url.searchParams.set("body", params.description);
  return url.toString();
}
