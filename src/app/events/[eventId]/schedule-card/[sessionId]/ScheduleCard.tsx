import { getDisplayName } from "~/utils/userDisplay";
import "./schedule-card.css";

interface Speaker {
  role: string;
  user: {
    id: string;
    firstName: string | null;
    surname: string | null;
    name: string | null;
    email: string | null;
    profile: {
      company: string | null;
      jobTitle: string | null;
    } | null;
  };
}

interface SessionData {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  speakers: string[];
  venue: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
  sessionType: { id: string; name: string; color: string } | null;
  track: { id: string; name: string; color: string } | null;
  sessionSpeakers: Speaker[];
}

interface ScheduleCardProps {
  session: SessionData;
  eventName: string;
}

function formatDayName(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).toUpperCase();
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).toUpperCase();
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export default function ScheduleCard({ session }: ScheduleCardProps) {
  const dayName = formatDayName(session.startTime);
  const dateStr = formatDate(session.startTime);
  const timeStr = formatTime(session.startTime);

  const venueDisplay = [session.venue?.name, session.room?.name]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="sc-page">
      <div className="sc-card">
        {/* Top bar */}
        <div className="sc-topbar">
          <div className="sc-topbar-day">{dayName}</div>
          <div className="sc-topbar-venue">{venueDisplay}</div>
          <div className="sc-topbar-date">{dateStr}</div>
        </div>

        {/* Content */}
        <div className="sc-content">
          <div className="sc-time">{timeStr}</div>

          {session.sessionType && (
            <div className="sc-type">{session.sessionType.name.toUpperCase()}</div>
          )}

          <h1 className="sc-title">{session.title}</h1>

          {/* Speakers */}
          {(session.sessionSpeakers.length > 0 || session.speakers.length > 0) && (
            <div className="sc-speakers">
              {session.sessionSpeakers.map((speaker) => (
                <div key={speaker.user.id} className="sc-speaker">
                  <div className="sc-speaker-name">
                    {getDisplayName(speaker.user, "Unknown")}
                  </div>
                  {speaker.user.profile?.company && (
                    <div className="sc-speaker-company">
                      {speaker.user.profile.company}
                    </div>
                  )}
                </div>
              ))}
              {session.speakers.map((name) => (
                <div key={name} className="sc-speaker">
                  <div className="sc-speaker-name">{name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
