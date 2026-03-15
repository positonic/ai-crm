/**
 * ICS (iCalendar) file generation utility for conference session calendar invites.
 * Generates RFC 5545 compliant VCALENDAR strings with METHOD:REQUEST.
 *
 * NOTE: Session times in the database are stored as UTC DateTime values but
 * actually represent Pacific Time. We output them with TZID=America/Los_Angeles
 * so calendar apps interpret them correctly.
 */

const EVENT_TIMEZONE = "America/Los_Angeles";

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

/**
 * Format a Date as a local-style iCalendar timestamp (no Z suffix).
 * Uses getUTC* methods because the DB stores PT values in the UTC fields.
 */
function formatDateLocal(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}`;
}

/**
 * Format a Date as a UTC iCalendar timestamp (with Z suffix).
 * Used only for DTSTAMP which must be true UTC.
 */
function formatDateUTC(date: Date): string {
  return formatDateLocal(date) + "Z";
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * VTIMEZONE block for America/Los_Angeles (Pacific Time).
 * Includes both standard (PST, UTC-8) and daylight (PDT, UTC-7) rules.
 */
const VTIMEZONE_LA = [
  "BEGIN:VTIMEZONE",
  "TZID:America/Los_Angeles",
  "BEGIN:STANDARD",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11",
  "TZOFFSETFROM:-0700",
  "TZOFFSETTO:-0800",
  "TZNAME:PST",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3",
  "TZOFFSETFROM:-0800",
  "TZOFFSETTO:-0700",
  "TZNAME:PDT",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
].join("\r\n");

export function generateIcsEvent(params: IcsEventParams): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FundingTheCommons//SessionSchedule//EN",
    "METHOD:REQUEST",
    VTIMEZONE_LA,
    "BEGIN:VEVENT",
    `UID:${params.uid}@fundingthecommons.io`,
    `DTSTAMP:${formatDateUTC(new Date())}`,
    `DTSTART;TZID=${EVENT_TIMEZONE}:${formatDateLocal(params.startTime)}`,
    `DTEND;TZID=${EVENT_TIMEZONE}:${formatDateLocal(params.endTime)}`,
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
 * Google Calendar's URL API uses the `ctz` param for timezone.
 */
export function generateGoogleCalendarUrl(params: IcsEventParams): string {
  const fmt = (d: Date) => formatDateLocal(d);
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.summary);
  url.searchParams.set("dates", `${fmt(params.startTime)}/${fmt(params.endTime)}`);
  url.searchParams.set("ctz", EVENT_TIMEZONE);
  if (params.location) url.searchParams.set("location", params.location);
  if (params.description) url.searchParams.set("details", params.description);
  return url.toString();
}

/**
 * Generate an Outlook.com "Add Event" URL.
 * Outlook uses ISO strings but we append the timezone offset.
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
