import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function DDSPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Deliberative Data Store (DDS)</h1>
      <p className="docs-page-subtitle">
        Publish deliberation results as verifiable, decentralised records on the
        AT Protocol network.
      </p>

      <h2 id="what-is-dds" className="docs-heading-h2">
        What Is the Deliberative Data Store?
      </h2>
      <p className="docs-text">
        The Deliberative Data Store (DDS) is the publication layer of the{" "}
        <Link href="/docs/features/deliberation" className="docs-link">
          Deliberation
        </Link>{" "}
        feature. After a deliberation is analysed, the results &ndash; narrative
        synthesis, classified priorities, topic clusters, and blocker themes
        &ndash; can be published as open, tamper-evident records on the{" "}
        <a
          href="https://atproto.com"
          target="_blank"
          rel="noopener noreferrer"
          className="docs-link"
        >
          AT Protocol
        </a>{" "}
        network.
      </p>
      <p className="docs-text">
        This turns community decisions into publicly verifiable data. Anyone can
        independently verify what a community decided, when, and with what level
        of consensus &ndash; without trusting a single platform.
      </p>

      <h2 id="why-publish" className="docs-heading-h2">
        Why Publish to DDS?
      </h2>
      <ul className="docs-list">
        <li>
          <strong>Transparency</strong> &ndash; Community members can verify that
          published results match what was deliberated, not what an organiser
          chose to highlight.
        </li>
        <li>
          <strong>Portability</strong> &ndash; Results live on a decentralised
          protocol, not locked inside a platform. They can be read by any AT
          Protocol client.
        </li>
        <li>
          <strong>Composability</strong> &ndash; Other tools can build on top of
          published deliberation data &ndash; dashboards, grant applications, or
          impact reports can reference the records directly.
        </li>
        <li>
          <strong>Auditability</strong> &ndash; Each record has a content hash
          (CID) that proves the data has not been altered after publication.
        </li>
      </ul>

      <h2 id="record-types" className="docs-heading-h2">
        Record Types
      </h2>
      <p className="docs-text">
        Publishing a deliberation creates four AT Protocol records, each serving
        a different purpose:
      </p>

      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Record</th>
              <th>Collection</th>
              <th>Contents</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Summary</strong>
              </td>
              <td>
                <code>org.dds.result.summary</code>
              </td>
              <td>
                Narrative synthesis, statistics, blocker themes, and resource
                recommendations.
              </td>
            </tr>
            <tr>
              <td>
                <strong>PCA</strong>
              </td>
              <td>
                <code>org.dds.result.pca</code>
              </td>
              <td>
                Priority classification analysis &ndash; each priority with its
                convergent/blind&nbsp;spot/aspirational classification and topic
                clusters.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Activity</strong>
              </td>
              <td>
                <code>org.hypercerts.claim.activity</code>
              </td>
              <td>
                A{" "}
                <Link
                  href="/docs/features/activity-certs"
                  className="docs-link"
                >
                  Hypercerts
                </Link>{" "}
                activity record linking the deliberation to the event with
                participation statistics.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Board</strong>
              </td>
              <td>
                <code>org.hyperboards.board</code>
              </td>
              <td>
                A hyperboard pointing to the activity record for visual
                presentation on{" "}
                <a
                  href="https://www.hyperscan.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="docs-link"
                >
                  Hyperscan
                </a>
                .
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="docs-text">
        Records reference each other: the PCA record links to the summary, the
        activity record links to the summary, and the board links to the
        activity. This creates a verifiable graph of the deliberation output.
      </p>

      <h2 id="how-to-publish" className="docs-heading-h2">
        How to Publish
      </h2>
      <p className="docs-text">
        Publishing is a step-by-step process that builds on the{" "}
        <Link href="/docs/features/deliberation" className="docs-link">
          Deliberation
        </Link>{" "}
        workflow. You must complete each stage before proceeding to the next.
      </p>

      <h3 id="step-1-close" className="docs-heading-h3">
        Step 1: Close the Deliberation
      </h3>
      <p className="docs-text">
        Once you have collected enough priorities, votes, blockers, and resource
        suggestions, close the deliberation from the Admin Panel. This locks
        submissions so the data is stable for analysis.
      </p>
      <ol className="docs-list">
        <li>
          Go to <strong>Admin &rarr; Events &rarr; [Your Event]</strong>.
        </li>
        <li>Find the Deliberation section.</li>
        <li>
          Click <strong>Close Submissions</strong>.
        </li>
      </ol>

      <h3 id="step-2-cluster" className="docs-heading-h3">
        Step 2: Run Topic Clustering
      </h3>
      <p className="docs-text">
        If you have session transcripts linked to the deliberation, run topic
        clustering to extract the automated signal &ndash; recurring themes
        discussed across sessions.
      </p>
      <ol className="docs-list">
        <li>
          Click <strong>Run Clustering</strong> in the deliberation management
          panel.
        </li>
        <li>
          The system sends transcript text to GPT-4o and extracts the top 10
          &ndash; 15 topic clusters.
        </li>
        <li>
          Clusters appear in a sidebar on the Priorities page once processing
          completes.
        </li>
      </ol>

      <div className="docs-callout">
        <strong>Note:</strong> Clustering requires at least one completed
        transcription linked to the deliberation. If no transcripts are
        available, skip this step &ndash; the analysis will proceed with
        priorities and votes only.
      </div>

      <h3 id="step-3-analyse" className="docs-heading-h3">
        Step 3: Run Analysis
      </h3>
      <p className="docs-text">
        Analysis merges the two signal sources &ndash; automated (topic
        clusters) and intentional (priorities and votes) &ndash; to produce the
        final results.
      </p>
      <ol className="docs-list">
        <li>
          Click <strong>Run Analysis</strong> in the deliberation management
          panel.
        </li>
        <li>
          GPT-4o classifies each priority as{" "}
          <strong>convergent</strong>, <strong>blind spot</strong>, or{" "}
          <strong>aspirational</strong> based on transcript evidence.
        </li>
        <li>
          The result includes a narrative synthesis, blocker themes, and resource
          recommendations.
        </li>
        <li>Results are stored on the deliberation record for review.</li>
      </ol>

      <h3 id="step-4-publish" className="docs-heading-h3">
        Step 4: Publish to DDS
      </h3>
      <p className="docs-text">
        Once you are satisfied with the analysis results, publish them to the AT
        Protocol network.
      </p>
      <ol className="docs-list">
        <li>
          Click <strong>Publish to DDS</strong> in the deliberation management
          panel.
        </li>
        <li>
          The platform authenticates with the organisation&apos;s AT Protocol
          account and creates the four records described above.
        </li>
        <li>
          The deliberation status changes to <strong>Published</strong>.
        </li>
        <li>
          AT Protocol URIs and content hashes (CIDs) are stored on the
          deliberation record.
        </li>
      </ol>
      <p className="docs-text">
        After publishing, the results page shows links to each record on the AT
        Protocol network.
      </p>

      <hr className="docs-divider" />

      <h2 id="prerequisites" className="docs-heading-h2">
        Prerequisites
      </h2>
      <p className="docs-text">
        DDS publication requires the same AT Protocol configuration used for{" "}
        <Link href="/docs/features/activity-certs" className="docs-link">
          Activity Certs
        </Link>
        :
      </p>
      <ul className="docs-list">
        <li>
          <code>ATPROTO_PLATFORM_HANDLE</code> &ndash; The organisation&apos;s
          AT Protocol handle (e.g. <code>yourorg.bsky.social</code>).
        </li>
        <li>
          <code>ATPROTO_PLATFORM_APP_PASSWORD</code> &ndash; An app password
          from the account settings.
        </li>
      </ul>
      <p className="docs-text">
        See{" "}
        <Link
          href="/docs/features/activity-certs#at-protocol-setup"
          className="docs-link"
        >
          AT Protocol Setup
        </Link>{" "}
        for instructions on creating an app password.
      </p>

      <div className="docs-callout">
        <strong>Important:</strong> Only administrators, staff, and event
        creators can publish to DDS. The deliberation must be in{" "}
        <strong>Closed</strong> or <strong>Analysing</strong> status and must
        have a completed analysis result.
      </div>

      <h2 id="data-stored" className="docs-heading-h2">
        Data Stored
      </h2>
      <p className="docs-text">
        After publishing, the following fields are saved on the deliberation
        record:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Summary URI / CID</td>
              <td>
                AT Protocol URI and content hash for the summary record.
              </td>
            </tr>
            <tr>
              <td>PCA URI / CID</td>
              <td>
                AT Protocol URI and content hash for the priority classification
                analysis.
              </td>
            </tr>
            <tr>
              <td>Activity URI / CID</td>
              <td>
                AT Protocol URI and content hash for the Hypercerts activity
                record.
              </td>
            </tr>
            <tr>
              <td>Board URI / CID</td>
              <td>
                AT Protocol URI and content hash for the hyperboard record.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="verification" className="docs-heading-h2">
        Verifying Published Records
      </h2>
      <p className="docs-text">
        Because records are published to the AT Protocol, anyone can verify them
        independently:
      </p>
      <ol className="docs-list">
        <li>
          <strong>Via Hyperscan</strong> &ndash; Browse the organisation&apos;s
          profile on{" "}
          <a
            href="https://www.hyperscan.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-link"
          >
            Hyperscan
          </a>{" "}
          to view activity certs and boards.
        </li>
        <li>
          <strong>Via AT Protocol API</strong> &ndash; Use{" "}
          <code>com.atproto.repo.getRecord</code> with the record URI to fetch
          the raw data and verify its CID.
        </li>
        <li>
          <strong>Via the results page</strong> &ndash; The deliberation results
          page displays links to each published record with its URI.
        </li>
      </ol>

      <hr className="docs-divider" />

      <h2 id="learn-more" className="docs-heading-h2">
        Learn More
      </h2>
      <ul className="docs-list">
        <li>
          <Link href="/docs/features/deliberation" className="docs-link">
            Deliberation
          </Link>{" "}
          &ndash; How the deliberation process works before publishing.
        </li>
        <li>
          <Link href="/docs/features/activity-certs" className="docs-link">
            Activity Certs
          </Link>{" "}
          &ndash; Event-level activity certs using the same Hypercerts schema.
        </li>
        <li>
          <a
            href="https://atproto.com/guides/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-link"
          >
            AT Protocol Overview
          </a>{" "}
          &ndash; Technical introduction to the AT Protocol.
        </li>
        <li>
          <a
            href="https://www.hyperscan.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-link"
          >
            Hyperscan
          </a>{" "}
          &ndash; Explorer for Hypercerts activity records and boards.
        </li>
        <li>
          <Link href="/docs/features/hypersphere" className="docs-link">
            Hypersphere
          </Link>{" "}
          &ndash; Live feed of ecosystem activity including published
          deliberation records.
        </li>
      </ul>
    </>
  );
}
