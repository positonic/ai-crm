import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function QuickstartPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Quickstart</h1>
      <p className="docs-page-subtitle">
        Get up and running with the Impactful Events platform in five minutes.
      </p>

      <h2 id="create-your-account" className="docs-heading-h2">
        1. Create Your Account
      </h2>
      <p className="docs-text">
        Visit the{" "}
        <Link href="/auth/signin" className="docs-link">
          sign-in page
        </Link>{" "}
        and create your account. You can sign up using your Discord account for
        one-click access, or register with an email address and password.
      </p>
      <p className="docs-text">
        Once signed in, you will land on your dashboard where you can see events
        you have joined, applications in progress, and recent activity.
      </p>

      <h2 id="find-your-event" className="docs-heading-h2">
        2. Find Your Event
      </h2>
      <p className="docs-text">
        Head to the{" "}
        <Link href="/events" className="docs-link">
          Events page
        </Link>{" "}
        to see all available conferences and gatherings. Each event card shows
        the name, dates, location, and a short description so you can quickly
        find the one you are looking for.
      </p>
      <p className="docs-text">
        Click on any event to open its full detail page, where you will find the
        complete description, schedule, and an option to apply.
      </p>

      <h2 id="apply-to-participate" className="docs-heading-h2">
        3. Apply to Participate
      </h2>
      <p className="docs-text">
        Most events require a short application. Click the &ldquo;Apply&rdquo;
        button on the event page to open the application form. The form varies
        by event but typically asks for basic information about you and your
        interest in attending.
      </p>

      <div className="docs-callout">
        <p className="docs-callout-text">
          <strong>Your work is always saved.</strong> The platform automatically
          saves your progress as you fill in the form. You can close the page
          and come back later to finish &ndash; nothing will be lost.
        </p>
      </div>

      <p className="docs-text">
        When you are happy with your answers, hit &ldquo;Submit&rdquo;. You will
        receive a confirmation email, and you can check your application status
        at any time from the event page.
      </p>

      <h2 id="check-your-status" className="docs-heading-h2">
        4. Check Your Status
      </h2>
      <p className="docs-text">
        After submitting, your application will be reviewed by the event
        organisers. You will receive an email notification when a decision has
        been made. The possible outcomes are:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Accepted</strong> &ndash; Congratulations! You are in. You
          will gain full access to the event, including the schedule, projects,
          and any participant-only features.
        </li>
        <li>
          <strong>Waitlisted</strong> &ndash; You are on the waiting list. If a
          spot opens up, you will be notified automatically.
        </li>
        <li>
          <strong>Declined</strong> &ndash; Unfortunately there was not a spot
          this time. You can still browse public event information and apply to
          future events.
        </li>
      </ul>

      <h2 id="explore-the-event" className="docs-heading-h2">
        5. Explore the Event
      </h2>
      <p className="docs-text">
        Once accepted, the event page becomes your hub for everything related to
        the conference. Here is what you can do:
      </p>

      <h3 id="view-the-schedule" className="docs-heading-h3">
        View the Schedule
      </h3>
      <p className="docs-text">
        The{" "}
        <Link href="/docs/features/schedule" className="docs-link">
          Schedule
        </Link>{" "}
        tab shows all sessions, talks, and workshops organised by day and time.
        You can see which venue or floor each session takes place in, along with
        the speakers and a description of the topic.
      </p>

      <h3 id="start-a-project" className="docs-heading-h3">
        Start a Project
      </h3>
      <p className="docs-text">
        Many events encourage participants to work on{" "}
        <Link href="/docs/features/projects" className="docs-link">
          Projects
        </Link>
        . You can create a project from the event page, add a description, link
        a code repository, and post updates as your work progresses. Other
        participants can see your project and follow along.
      </p>

      <h3 id="connect-with-others" className="docs-heading-h3">
        Connect with Others
      </h3>
      <p className="docs-text">
        Browse the list of accepted participants to see who else is attending.
        Use the event as an opportunity to meet new people, form teams, and
        collaborate on ideas.
      </p>

      <hr className="docs-divider" />

      <h2 id="for-venue-partners" className="docs-heading-h2">
        For Venue Partners
      </h2>
      <p className="docs-text">
        If you have been assigned as a floor lead for a venue, you have
        additional capabilities:
      </p>
      <ol className="docs-list">
        <li>
          <strong>Access your floor</strong> &ndash; Look for the &ldquo;Manage
          Schedule&rdquo; tab in the event navigation. This appears
          automatically once an organiser assigns you to a venue.
        </li>
        <li>
          <strong>Manage sessions</strong> &ndash; Create, edit, and remove
          sessions on your floor. Set times, add speaker names, and toggle
          whether sessions are publicly visible.
        </li>
        <li>
          <strong>Update your space</strong> &ndash; Edit your venue&apos;s
          description, capacity, and other details.
        </li>
      </ol>
      <p className="docs-text">
        For a complete guide, see{" "}
        <Link href="/docs/features/floor-management" className="docs-link">
          Floor Management
        </Link>
        .
      </p>

      <hr className="docs-divider" />

      <h2 id="next-steps" className="docs-heading-h2">
        Next Steps
      </h2>
      <ul className="docs-list">
        <li>
          <Link href="/docs/get-started/your-account" className="docs-link">
            Set up your account
          </Link>{" "}
          &ndash; Complete your profile so organisers and other attendees can
          learn more about you.
        </li>
        <li>
          <Link href="/docs/features/overview" className="docs-link">
            Explore all features
          </Link>{" "}
          &ndash; A deeper look at everything the platform offers.
        </li>
        <li>
          <Link href="/docs/features/schedule" className="docs-link">
            Understand the schedule
          </Link>{" "}
          &ndash; Learn how sessions, venues, and times work together.
        </li>
      </ul>
    </>
  );
}
