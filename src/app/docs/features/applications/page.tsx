import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function ApplicationsPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Applications</h1>
      <p className="docs-page-subtitle">
        Apply to events with confidence &ndash; your progress is always saved.
      </p>

      <h2 id="how-applications-work" className="docs-heading-h2">
        How Applications Work
      </h2>
      <p className="docs-text">
        When you find an event you would like to attend, click
        &ldquo;Apply&rdquo; to open the application form. Each event has its own
        set of questions, designed by the organisers to learn about you and why
        you would like to participate.
      </p>

      <h2 id="filling-in-the-form" className="docs-heading-h2">
        Filling in the Form
      </h2>
      <p className="docs-text">
        Simply work through the questions at your own pace. The platform saves
        your answers automatically as you go &ndash; there is no need to worry
        about losing your work if you close the page or lose your internet
        connection.
      </p>

      <div className="docs-callout">
        <p className="docs-callout-text">
          <strong>Take your time.</strong> You can start your application,
          leave, and come back later to finish it. Your draft will be waiting
          for you exactly where you left off.
        </p>
      </div>

      <h2 id="submitting" className="docs-heading-h2">
        Submitting Your Application
      </h2>
      <p className="docs-text">
        Once you have completed all the required fields, the
        &ldquo;Submit&rdquo; button will become available. After submitting, you
        will receive a confirmation email, and your application will move into
        the review queue.
      </p>

      <h2 id="tracking-your-status" className="docs-heading-h2">
        Tracking Your Status
      </h2>
      <p className="docs-text">
        You can check the status of your application at any time by visiting the
        event page. The possible statuses are:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Draft</strong> &ndash; You have started the application but
          not yet submitted it.
        </li>
        <li>
          <strong>Submitted</strong> &ndash; Your application is with the
          organisers for review.
        </li>
        <li>
          <strong>Accepted</strong> &ndash; You have been accepted to the event.
        </li>
        <li>
          <strong>Waitlisted</strong> &ndash; You are on the waiting list and
          will be notified if a spot opens.
        </li>
        <li>
          <strong>Declined</strong> &ndash; Your application was not accepted
          this time.
        </li>
      </ul>

      <h2 id="email-notifications" className="docs-heading-h2">
        Email Notifications
      </h2>
      <p className="docs-text">
        The platform automatically sends you an email whenever your application
        status changes. This means you do not need to keep checking the site
        &ndash; you will be informed the moment a decision is made.
      </p>

      <hr className="docs-divider" />

      <p className="docs-text">
        Learn more about what happens after acceptance in the{" "}
        <Link href="/docs/get-started/quickstart" className="docs-link">
          Quickstart guide
        </Link>
        .
      </p>
    </>
  );
}
