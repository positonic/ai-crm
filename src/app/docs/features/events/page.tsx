import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function EventsPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Events</h1>
      <p className="docs-page-subtitle">
        Discover, browse, and join conferences and community gatherings.
      </p>

      <h2 id="browsing-events" className="docs-heading-h2">
        Browsing Events
      </h2>
      <p className="docs-text">
        The{" "}
        <Link href="/events" className="docs-link">
          Events page
        </Link>{" "}
        lists all available conferences and gatherings. Each event card displays
        the event name, dates, location, and a short description to help you
        decide which ones interest you.
      </p>

      <h2 id="event-details" className="docs-heading-h2">
        Event Details
      </h2>
      <p className="docs-text">
        Click on any event to see its full detail page. Here you will find a
        complete description of the event, information about the organisers, and
        links to the{" "}
        <Link href="/docs/features/schedule" className="docs-link">
          schedule
        </Link>
        ,{" "}
        <Link href="/docs/features/projects" className="docs-link">
          projects
        </Link>
        , and other relevant sections.
      </p>

      <h2 id="joining-an-event" className="docs-heading-h2">
        Joining an Event
      </h2>
      <p className="docs-text">
        To join an event, you will typically need to submit an{" "}
        <Link href="/docs/features/applications" className="docs-link">
          application
        </Link>
        . Some events may accept participants directly through{" "}
        <Link href="/docs/features/invitations" className="docs-link">
          invitations
        </Link>{" "}
        sent by the organisers. Once accepted, you gain access to all
        participant features for that event.
      </p>

      <h2 id="what-you-get" className="docs-heading-h2">
        What You Get as a Participant
      </h2>
      <p className="docs-text">Once you are part of an event, you can:</p>
      <ul className="docs-list">
        <li>View the full schedule of sessions and workshops</li>
        <li>Create and manage projects</li>
        <li>See other participants and speakers</li>
        <li>Post updates and share your progress</li>
        <li>
          Access any participant-only features the organisers have enabled
        </li>
      </ul>

      <hr className="docs-divider" />

      <p className="docs-text">
        Ready to find an event?{" "}
        <Link href="/events" className="docs-link">
          Browse available events &rarr;
        </Link>
      </p>
    </>
  );
}
