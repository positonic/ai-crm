import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function ActivityCertsPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Activity Certs</h1>
      <p className="docs-page-subtitle">
        Publish verifiable impact records for your events on the decentralised
        AT Protocol network using Hypercerts.
      </p>

      <h2 id="what-are-activity-certs" className="docs-heading-h2">
        What Are Activity Certs?
      </h2>
      <p className="docs-text">
        An Activity Cert is a public, tamper-evident record of an event and its
        contributors. It is stored on the{" "}
        <a
          href="https://atproto.com"
          target="_blank"
          rel="noopener noreferrer"
          className="docs-link"
        >
          AT Protocol
        </a>{" "}
        (the same decentralised network that powers Bluesky) using the{" "}
        <a
          href="https://www.hyperscan.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="docs-link"
        >
          Hypercerts
        </a>{" "}
        schema. Once published, the record is openly verifiable and can be
        referenced by anyone on the network.
      </p>

      <h2 id="how-it-works" className="docs-heading-h2">
        How It Works
      </h2>
      <p className="docs-text">
        When you publish an Activity Cert for an event, the platform creates two
        records on the AT Protocol network:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Activity Record</strong> &ndash; An{" "}
          <code>org.hypercerts.claim.activity</code> record containing the event
          title, description, dates, and a list of contributors (speakers).
        </li>
        <li>
          <strong>Hyperboard</strong> &ndash; An{" "}
          <code>org.hyperboards.board</code> record that references the activity
          cert, enabling visual presentation on compatible explorers like{" "}
          <a
            href="https://www.hyperscan.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-link"
          >
            Hyperscan
          </a>
          .
        </li>
      </ul>
      <p className="docs-text">
        Both records are published from the organisation&apos;s dedicated AT
        Protocol account, not from any individual user&apos;s account.
      </p>

      <h2 id="contributors" className="docs-heading-h2">
        Contributors
      </h2>
      <p className="docs-text">
        Every speaker from the event&apos;s{" "}
        <Link href="/docs/features/schedule" className="docs-link">
          published sessions
        </Link>{" "}
        is automatically included as a contributor on the activity cert.
        Speakers are deduplicated across sessions, so a person who speaks at
        multiple sessions appears only once.
      </p>
      <p className="docs-text">Each contributor entry includes:</p>
      <ul className="docs-list">
        <li>
          <strong>Display Name</strong> &ndash; The speaker&apos;s full name.
        </li>
        <li>
          <strong>Identifier</strong> &ndash; If the speaker has a connected AT
          Protocol account, their decentralised identifier (DID) is included.
          Speakers without an AT Protocol account are still listed by name.
        </li>
        <li>
          <strong>Role</strong> &ndash; The speaker&apos;s role in the session
          (e.g. Speaker, Facilitator, Panelist).
        </li>
      </ul>

      <h2 id="publishing" className="docs-heading-h2">
        Publishing an Activity Cert
      </h2>
      <p className="docs-text">
        Activity certs are published from the{" "}
        <Link href="/docs/organizers/admin-panel" className="docs-link">
          Admin Panel
        </Link>
        . Only administrators, staff, and event creators can publish.
      </p>
      <ol className="docs-list">
        <li>
          Go to <strong>Admin &rarr; Events &rarr; [Your Event]</strong>.
        </li>
        <li>
          Scroll to the <strong>Integrations</strong> section.
        </li>
        <li>
          In the <strong>Activity Cert (Hypercerts)</strong> card, click{" "}
          <strong>Publish Activity Cert</strong>.
        </li>
        <li>
          The platform will gather all speakers from published sessions, create
          the activity record and hyperboard, and store the result.
        </li>
      </ol>
      <p className="docs-text">
        Once published, the card shows a green &ldquo;Published&rdquo; badge,
        the publication date, and the AT Protocol URI of the record.
      </p>

      <div className="docs-callout">
        <strong>Note:</strong> Publishing is a one-time action per event. Once an
        activity cert is published, it cannot be re-published. Make sure all
        sessions and speakers are finalised before publishing.
      </div>

      <h2 id="viewing-on-hyperscan" className="docs-heading-h2">
        Viewing on Hyperscan
      </h2>
      <p className="docs-text">
        After publishing, the activity cert and hyperboard are visible on{" "}
        <a
          href="https://www.hyperscan.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="docs-link"
        >
          Hyperscan
        </a>
        , the explorer for the Hypersphere ecosystem. You can search for the
        organisation&apos;s AT Protocol handle to find all published activity
        certs and boards.
      </p>

      <hr className="docs-divider" />

      <h2 id="at-protocol-setup" className="docs-heading-h2">
        AT Protocol Setup (For Platform Administrators)
      </h2>
      <p className="docs-text">
        To enable activity cert publishing, the platform needs a dedicated AT
        Protocol account. This is configured through environment variables:
      </p>
      <ul className="docs-list">
        <li>
          <code>ATPROTO_PLATFORM_HANDLE</code> &ndash; The handle of the
          organisation&apos;s AT Protocol account (e.g.{" "}
          <code>yourorg.bsky.social</code>).
        </li>
        <li>
          <code>ATPROTO_PLATFORM_APP_PASSWORD</code> &ndash; An app password
          generated from the account&apos;s settings (not the main password).
        </li>
      </ul>
      <p className="docs-text">
        If these variables are not set, the publish button will display an error
        message asking the administrator to configure them.
      </p>

      <h3 id="creating-an-app-password" className="docs-heading-h3">
        Creating an App Password
      </h3>
      <ol className="docs-list">
        <li>
          Sign in to{" "}
          <a
            href="https://bsky.app"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-link"
          >
            bsky.app
          </a>{" "}
          with the organisation&apos;s account.
        </li>
        <li>
          Go to{" "}
          <a
            href="https://bsky.app/settings/app-passwords"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-link"
          >
            Settings &rarr; App Passwords
          </a>
          .
        </li>
        <li>
          Click <strong>Add App Password</strong>, give it a descriptive name
          (e.g. &ldquo;Impactful Events&rdquo;), and copy the generated
          password.
        </li>
        <li>
          Add both values to your environment configuration.
        </li>
      </ol>

      <h2 id="data-stored" className="docs-heading-h2">
        Data Stored
      </h2>
      <p className="docs-text">
        When an activity cert is published, the following fields are saved on
        the event record in the database for reference:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Activity Cert URI</strong> &ndash; The AT Protocol URI of the
          activity record.
        </li>
        <li>
          <strong>Hyperboard URI</strong> &ndash; The AT Protocol URI of the
          hyperboard record.
        </li>
        <li>
          <strong>Published At</strong> &ndash; The timestamp of when the cert
          was published.
        </li>
      </ul>
    </>
  );
}
