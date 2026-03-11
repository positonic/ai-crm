import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function SchedulePage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Schedule</h1>
      <p className="docs-page-subtitle">
        View sessions, speakers, and venues so you can plan your conference
        experience.
      </p>

      <h2 id="viewing-the-schedule" className="docs-heading-h2">
        Viewing the Schedule
      </h2>
      <p className="docs-text">
        Every event has a Schedule tab that displays all planned sessions. You
        will see each session&apos;s title, time, venue, speakers, and a brief
        description. Sessions are organised by day to make it easy to plan
        ahead.
      </p>

      <h2 id="sessions" className="docs-heading-h2">
        Sessions
      </h2>
      <p className="docs-text">
        A session is any individual activity on the schedule &ndash; a talk, a
        workshop, a panel discussion, or a social event. Each session includes:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Title</strong> &ndash; What the session is about.
        </li>
        <li>
          <strong>Time</strong> &ndash; When it starts and ends.
        </li>
        <li>
          <strong>Venue</strong> &ndash; Which floor or room it takes place in.
        </li>
        <li>
          <strong>Speakers</strong> &ndash; Who is presenting or leading the
          session.
        </li>
        <li>
          <strong>Description</strong> &ndash; A summary of what to expect.
        </li>
        <li>
          <strong>Type</strong> &ndash; The category of session (talk, workshop,
          social, etc.).
        </li>
      </ul>

      <h2 id="venues-and-floors" className="docs-heading-h2">
        Venues and Floors
      </h2>
      <p className="docs-text">
        Larger events may span multiple venues or floors. The schedule clearly
        indicates where each session takes place, so you can navigate the
        physical space with confidence. Each venue may have its own capacity and
        description to help you find your way.
      </p>

      <h2 id="published-vs-draft" className="docs-heading-h2">
        Published vs. Draft Sessions
      </h2>
      <p className="docs-text">
        Only published sessions appear on the public schedule. Organisers and
        floor leads may have draft sessions that are still being planned &ndash;
        these will appear once they are finalised and made public.
      </p>

      <hr className="docs-divider" />

      <h2 id="managing-the-schedule" className="docs-heading-h2">
        Managing the Schedule
      </h2>
      <p className="docs-text">
        If you are a{" "}
        <Link href="/docs/features/floor-management" className="docs-link">
          floor lead
        </Link>
        , you can create and edit sessions on your assigned venue directly from
        the platform. See the{" "}
        <Link href="/docs/features/floor-management" className="docs-link">
          Floor Management
        </Link>{" "}
        guide for details.
      </p>
      <p className="docs-text">
        Event organisers have full control over the schedule through the{" "}
        <Link href="/docs/organizers/admin-panel" className="docs-link">
          Admin Panel
        </Link>
        .
      </p>
    </>
  );
}
