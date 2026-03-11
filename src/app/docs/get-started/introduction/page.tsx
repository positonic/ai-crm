import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function IntroductionPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Introduction</h1>
      <p className="docs-page-subtitle">
        Welcome to Impactful Events &ndash; the platform that powers your
        conference experience from start to finish.
      </p>

      <h2 id="welcome" className="docs-heading-h2">
        Welcome to Impactful Events
      </h2>
      <p className="docs-text">
        Impactful Events is a purpose-built platform for running conferences,
        residencies, and community gatherings. Whether you are an attendee
        exploring the schedule, a speaker preparing a session, or an organiser
        coordinating multiple venues, this platform gives you everything you
        need in one place.
      </p>
      <p className="docs-text">
        This documentation will walk you through every part of the platform so
        you can get the most out of your experience. No technical knowledge is
        required &ndash; we have written everything in plain, everyday language.
      </p>

      <h2 id="what-you-can-do" className="docs-heading-h2">
        What You Can Do
      </h2>

      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>
                  <Link href="/docs/features/events" className="docs-link">
                    Events
                  </Link>
                </strong>
              </td>
              <td>
                Browse upcoming conferences, view details, and join the ones
                that interest you.
              </td>
            </tr>
            <tr>
              <td>
                <strong>
                  <Link
                    href="/docs/features/applications"
                    className="docs-link"
                  >
                    Applications
                  </Link>
                </strong>
              </td>
              <td>
                Apply to participate in events with a simple form that saves
                your progress automatically.
              </td>
            </tr>
            <tr>
              <td>
                <strong>
                  <Link href="/docs/features/schedule" className="docs-link">
                    Schedule
                  </Link>
                </strong>
              </td>
              <td>
                View sessions, speakers, and times so you never miss a talk or
                workshop.
              </td>
            </tr>
            <tr>
              <td>
                <strong>
                  <Link
                    href="/docs/features/floor-management"
                    className="docs-link"
                  >
                    Floor Management
                  </Link>
                </strong>
              </td>
              <td>
                Venue partners can manage their own floors, sessions, and
                availability.
              </td>
            </tr>
            <tr>
              <td>
                <strong>
                  <Link href="/docs/features/projects" className="docs-link">
                    Projects
                  </Link>
                </strong>
              </td>
              <td>
                Create and showcase projects, track progress, and collaborate
                with others.
              </td>
            </tr>
            <tr>
              <td>
                <strong>
                  <Link href="/docs/features/invitations" className="docs-link">
                    Invitations
                  </Link>
                </strong>
              </td>
              <td>
                Receive and manage invitations to events and special roles.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="quick-start" className="docs-heading-h2">
        Quick Start
      </h2>
      <p className="docs-text">
        New to the platform? Here is how to get started in just a few minutes:
      </p>
      <ol className="docs-list">
        <li>
          <strong>
            <Link href="/auth/signin" className="docs-link">
              Create your account
            </Link>
          </strong>{" "}
          &ndash; Sign up with Discord or an email address.
        </li>
        <li>
          <strong>Browse events</strong> &ndash; Head to the{" "}
          <Link href="/events" className="docs-link">
            Events page
          </Link>{" "}
          and find a conference that interests you.
        </li>
        <li>
          <strong>Submit an application</strong> &ndash; Fill in a short form to
          request your spot. Your progress is saved automatically.
        </li>
        <li>
          <strong>Check your status</strong> &ndash; You will receive an email
          once your application has been reviewed.
        </li>
        <li>
          <strong>Explore the schedule</strong> &ndash; Once accepted, view the
          full programme and plan your days.
        </li>
      </ol>
      <p className="docs-text">
        For a more detailed walkthrough, see the{" "}
        <Link href="/docs/get-started/quickstart" className="docs-link">
          Quickstart guide
        </Link>
        .
      </p>

      <h2 id="documentation-sections" className="docs-heading-h2">
        Documentation Sections
      </h2>

      <h3 id="section-get-started" className="docs-heading-h3">
        Get Started
      </h3>
      <p className="docs-text">
        Everything you need to create your account, understand the basics, and
        begin using the platform.{" "}
        <Link href="/docs/get-started/quickstart" className="docs-link">
          Start here &rarr;
        </Link>
      </p>

      <h3 id="section-features" className="docs-heading-h3">
        Features
      </h3>
      <p className="docs-text">
        In-depth guides for every feature &ndash; from browsing events and
        managing your schedule to running projects and coordinating venues.{" "}
        <Link href="/docs/features/overview" className="docs-link">
          Explore features &rarr;
        </Link>
      </p>

      <h3 id="section-organizers" className="docs-heading-h3">
        For Organizers
      </h3>
      <p className="docs-text">
        If you are running a conference or managing a venue, this section covers
        the admin panel, floor lead assignments, and everything else you need to
        coordinate a successful event.{" "}
        <Link href="/docs/organizers/admin-panel" className="docs-link">
          Organizer guides &rarr;
        </Link>
      </p>

      <h2 id="getting-help" className="docs-heading-h2">
        Getting Help
      </h2>
      <p className="docs-text">
        If you cannot find what you are looking for in these docs, reach out to
        the event organisers directly. They will be happy to help you navigate
        the platform and answer any questions.
      </p>

      <h2 id="ready" className="docs-heading-h2">
        Ready?
      </h2>
      <p className="docs-text">
        Jump straight into the{" "}
        <Link href="/docs/get-started/quickstart" className="docs-link">
          Quickstart guide
        </Link>{" "}
        to set up your account and find your first event, or browse the{" "}
        <Link href="/docs/features/overview" className="docs-link">
          Features overview
        </Link>{" "}
        to see everything the platform has to offer.
      </p>
    </>
  );
}
