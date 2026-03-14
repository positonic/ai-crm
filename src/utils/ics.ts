/**
 * ICS (iCalendar) file generation utility for conference session calendar invites.
 * Generates RFC 5545 compliant VCALENDAR strings with METHOD:PUBLISH.
 */

export interface IcsEventParams {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizerEmail?: string;
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
    "METHOD:PUBLISH",
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

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}
