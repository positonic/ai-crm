import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function FeaturesOverviewPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Features Overview</h1>
      <p className="docs-page-subtitle">
        A complete look at everything the Impactful Events platform has to offer.
      </p>

      <h2 id="events" className="docs-heading-h2">
        Events
      </h2>
      <p className="docs-text">
        At the heart of the platform are{" "}
        <Link href="/docs/features/events" className="docs-link">
          Events
        </Link>
        . Each event represents a conference, residency, or community gathering.
        You can browse upcoming events, view their details, and apply to
        participate.
      </p>

      <h2 id="applications" className="docs-heading-h2">
        Applications
      </h2>
      <p className="docs-text">
        The{" "}
        <Link href="/docs/features/applications" className="docs-link">
          application system
        </Link>{" "}
        handles everything from submitting your interest to tracking your status.
        Forms save automatically as you type, so you never lose your work.
        Organisers review applications and you are notified by email when a
        decision is made.
      </p>

      <h2 id="schedule" className="docs-heading-h2">
        Schedule
      </h2>
      <p className="docs-text">
        Every event has a{" "}
        <Link href="/docs/features/schedule" className="docs-link">
          schedule
        </Link>{" "}
        showing sessions, talks, and workshops organised by day and venue. You
        can see who is speaking, what time each session starts, and where it
        takes place.
      </p>

      <h2 id="floor-management" className="docs-heading-h2">
        Floor Management
      </h2>
      <p className="docs-text">
        The{" "}
        <Link href="/docs/features/floor-management" className="docs-link">
          floor management
        </Link>{" "}
        system allows venue partners to manage their own spaces independently.
        Floor leads can create and edit sessions, update venue details, and
        coordinate with event organisers &ndash; all without needing full admin
        access.
      </p>

      <h2 id="projects" className="docs-heading-h2">
        Projects
      </h2>
      <p className="docs-text">
        <Link href="/docs/features/projects" className="docs-link">
          Projects
        </Link>{" "}
        let participants showcase the work they create during events. You can add
        descriptions, link code repositories, post timeline updates, and
        collaborate with team members.
      </p>

      <h2 id="invitations" className="docs-heading-h2">
        Invitations
      </h2>
      <p className="docs-text">
        <Link href="/docs/features/invitations" className="docs-link">
          Invitations
        </Link>{" "}
        allow organisers to bring people into events with specific roles.
        Whether you are invited as a participant, speaker, or venue partner, the
        invitation system handles the onboarding process seamlessly.
      </p>

      <h2 id="activity-certs" className="docs-heading-h2">
        Activity Certs
      </h2>
      <p className="docs-text">
        <Link href="/docs/features/activity-certs" className="docs-link">
          Activity Certs
        </Link>{" "}
        let organisers publish verifiable impact records for their events on the
        decentralised AT Protocol network using the Hypercerts schema.
      </p>

      <h2 id="hypersphere" className="docs-heading-h2">
        Hypersphere Intelligence
      </h2>
      <p className="docs-text">
        The{" "}
        <Link href="/docs/features/hypersphere" className="docs-link">
          Hypersphere integration
        </Link>{" "}
        surfaces live network data from the Hypersphere ecosystem. View network
        stats and feeds on the Impact page, see enriched profile data for users
        with AT Protocol accounts, and ask the AI assistant about real-time
        network activity.
      </p>

      <hr className="docs-divider" />

      <h2 id="for-organizers" className="docs-heading-h2">
        For Organizers
      </h2>
      <p className="docs-text">
        If you are running a conference, the{" "}
        <Link href="/docs/organizers/admin-panel" className="docs-link">
          Admin Panel
        </Link>{" "}
        gives you full control over events, applications, schedules, and
        participants. You can also{" "}
        <Link href="/docs/organizers/floor-owners" className="docs-link">
          assign floor leads
        </Link>{" "}
        to delegate venue management to partners.
      </p>
    </>
  );
}
