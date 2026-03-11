import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function DeliberationPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Deliberation</h1>
      <p className="docs-page-subtitle">
        A structured system for attendees to surface, vote on, and discuss
        community priorities during events.
      </p>

      <h2 id="what-is-deliberation" className="docs-heading-h2">
        What Is Deliberation?
      </h2>
      <p className="docs-text">
        The Deliberation feature gives event attendees a structured way to
        identify what matters most to their community. During an event,
        participants submit priorities &ndash; topics, challenges, or goals they
        believe deserve attention &ndash; and vote on each other&apos;s
        submissions. The result is a ranked list of community priorities shaped
        by real participant input.
      </p>
      <p className="docs-text">
        Organisers can also capture signals from live sessions through
        transcription and topic analysis, which are combined with submitted
        priorities to produce a richer picture of what the community actually
        cares about.
      </p>

      <h2 id="how-it-works" className="docs-heading-h2">
        How It Works
      </h2>
      <p className="docs-text">A deliberation moves through four stages:</p>
      <ol className="docs-list">
        <li>
          <strong>Collecting</strong> &ndash; The deliberation is open.
          Attendees can submit priorities, vote, flag blockers, and suggest
          resources.
        </li>
        <li>
          <strong>Closed</strong> &ndash; Submissions are locked. No new
          priorities or votes are accepted, but existing data is preserved for
          analysis.
        </li>
        <li>
          <strong>Analysing</strong> &ndash; Submitted priorities are combined
          with transcript data (if available) to produce ranked results,
          identify blind spots, and surface blocker themes.
        </li>
        <li>
          <strong>Published</strong> &ndash; Results are live and visible to all
          attendees on the results page.
        </li>
      </ol>

      <h2 id="submitting-priorities" className="docs-heading-h2">
        Submitting Priorities
      </h2>
      <p className="docs-text">
        Any accepted attendee can submit a priority during the Collecting phase.
        Each priority has:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Title</strong> (required) &ndash; A short, clear description
          of the priority. Minimum 3 characters.
        </li>
        <li>
          <strong>Description</strong> (optional) &ndash; Additional context or
          reasoning for why this matters.
        </li>
      </ul>
      <p className="docs-text">
        To submit a priority, navigate to the Priorities page for your event and
        click <strong>Submit Priority</strong>. Fill in the form and click{" "}
        <strong>Submit</strong>. Your priority will appear in the list
        immediately.
      </p>

      <h2 id="voting" className="docs-heading-h2">
        Voting
      </h2>
      <p className="docs-text">
        Each attendee can vote once per priority. Voting is a simple toggle
        &ndash; click the upvote arrow to add your vote, click again to remove
        it. Priorities are sorted by vote count by default, so the most
        supported items rise to the top.
      </p>
      <p className="docs-text">
        You can also sort priorities by most recent to see the latest
        submissions first.
      </p>

      <h2 id="blockers-and-resources" className="docs-heading-h2">
        Blockers &amp; Resource Suggestions
      </h2>
      <p className="docs-text">
        Beyond voting, attendees can add two types of feedback to any priority:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Blockers</strong> &ndash; Obstacles or challenges that stand
          in the way of addressing this priority. Click the blocker icon on any
          priority card to expand the section and add a description of the
          blocker.
        </li>
        <li>
          <strong>Resource Suggestions</strong> &ndash; Ideas for what resources
          could help address the priority. Choose a category (Funding, Talent,
          Tooling, or Other) and describe what would be needed.
        </li>
      </ul>
      <p className="docs-text">
        This additional context helps organisers understand not just{" "}
        <em>what</em> people care about, but <em>why</em> progress has been
        difficult and <em>how</em> the community thinks it can be addressed.
      </p>

      <h2 id="topic-clusters" className="docs-heading-h2">
        Topic Clusters
      </h2>
      <p className="docs-text">
        When session transcripts are available, the platform identifies
        recurring topics discussed across sessions and groups them into
        clusters. These appear in a sidebar on the Priorities page and show:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Topic label</strong> &ndash; A short name for the cluster.
        </li>
        <li>
          <strong>Keywords</strong> &ndash; Key terms associated with the topic.
        </li>
        <li>
          <strong>Mention count</strong> &ndash; How many times the topic was
          referenced in transcripts.
        </li>
        <li>
          <strong>Source excerpts</strong> &ndash; Relevant quotes from session
          transcripts.
        </li>
      </ul>
      <p className="docs-text">
        Topic clusters help attendees see what the community is already talking
        about, which can inform their priority submissions.
      </p>

      <div className="docs-callout">
        <strong>Note:</strong> Topic clusters are generated from session
        transcripts by an external analysis process. They will appear
        automatically once transcripts have been processed.
      </div>

      <h2 id="results" className="docs-heading-h2">
        Results
      </h2>
      <p className="docs-text">
        Once analysis is complete and the deliberation is published, the results
        page shows a comprehensive view of community priorities. Results
        include:
      </p>

      <h3 id="signal-classification" className="docs-heading-h3">
        Signal Classification
      </h3>
      <p className="docs-text">
        Each priority receives a signal classification based on how it was
        surfaced:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Signal</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Convergent</strong>
              </td>
              <td>
                Discussed in sessions <em>and</em> submitted/voted on by
                attendees. These are the strongest signals.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Blind Spot</strong>
              </td>
              <td>
                Heavily discussed in sessions but not submitted as a priority.
                These may indicate topics the community cares about but
                hasn&apos;t formally recognised.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Aspirational</strong>
              </td>
              <td>
                Submitted and voted on but not discussed in sessions. These
                represent forward-looking goals the community wants to pursue.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 id="ranked-priorities" className="docs-heading-h3">
        Ranked Priorities
      </h3>
      <p className="docs-text">
        Priorities are ranked by signal strength &ndash; a score that combines
        vote count with transcript mention frequency. Each priority shows its
        signal classification badge, vote count, and any matched transcript
        topics.
      </p>

      <h3 id="blocker-themes" className="docs-heading-h3">
        Blocker Themes
      </h3>
      <p className="docs-text">
        Blockers submitted across all priorities are grouped into themes,
        helping organisers identify systemic challenges that affect multiple
        priorities.
      </p>

      <h3 id="resource-recommendations" className="docs-heading-h3">
        Resource Recommendations
      </h3>
      <p className="docs-text">
        Resource suggestions are aggregated and categorised, providing
        organisers with a clear view of what the community believes is needed to
        make progress.
      </p>

      <h3 id="synthesis" className="docs-heading-h3">
        Synthesis
      </h3>
      <p className="docs-text">
        A narrative summary ties together the ranked priorities, blind spots,
        blocker themes, and resource recommendations into a cohesive overview of
        the deliberation outcomes.
      </p>

      <hr className="docs-divider" />

      <h2 id="accessing-deliberation" className="docs-heading-h2">
        Accessing Deliberation
      </h2>
      <p className="docs-text">
        The Deliberation feature must be enabled by an event organiser. Once
        enabled:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Conference events</strong> show a Priorities card on the event
          dashboard that links to the deliberation page.
        </li>
        <li>
          <strong>Residency events</strong> show a Priorities tab in the event
          dashboard.
        </li>
        <li>
          You can also navigate directly to{" "}
          <code>/events/[event-slug]/deliberation</code>.
        </li>
      </ul>
      <p className="docs-text">
        Results (once published) are available at{" "}
        <code>/events/[event-slug]/deliberation/results</code>.
      </p>

      <h2 id="for-organizers" className="docs-heading-h2">
        For Organisers
      </h2>
      <p className="docs-text">
        Organisers manage deliberations from the{" "}
        <Link href="/docs/organizers/admin-panel" className="docs-link">
          Admin Panel
        </Link>
        . The management page provides:
      </p>
      <ol className="docs-list">
        <li>
          <strong>Create a deliberation</strong> &ndash; Set a title and
          optional description. Once created, the deliberation opens in
          Collecting status.
        </li>
        <li>
          <strong>Monitor submissions</strong> &ndash; See real-time counts of
          priorities, votes, and transcripts.
        </li>
        <li>
          <strong>Moderate content</strong> &ndash; Toggle the visibility of
          individual priorities using the moderation queue. Hidden priorities
          are not shown to attendees.
        </li>
        <li>
          <strong>Close submissions</strong> &ndash; Lock the deliberation to
          prevent new submissions when ready.
        </li>
        <li>
          <strong>Publish results</strong> &ndash; Once analysis is complete,
          mark the deliberation as Published to make results visible to
          attendees.
        </li>
      </ol>

      <div className="docs-callout">
        <strong>Tip:</strong> Enable the Deliberation feature flag in the{" "}
        <Link href="/docs/organizers/admin-panel" className="docs-link">
          Admin Panel
        </Link>{" "}
        under <strong>Feature Configuration</strong> before creating a
        deliberation.
      </div>

      <h2 id="verifiable-records" className="docs-heading-h2">
        Verifiable Records
      </h2>
      <p className="docs-text">
        When results are published, they can optionally be anchored to the
        decentralised AT Protocol network. If configured, the results page
        displays links to:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Summary record</strong> &ndash; The deliberation summary
          published as a verifiable AT Protocol record.
        </li>
        <li>
          <strong>Topic Analysis record</strong> &ndash; The topic clustering
          results.
        </li>
        <li>
          <strong>Activity Cert</strong> &ndash; A Hypercerts activity record
          linking the deliberation to the event&apos;s{" "}
          <Link href="/docs/features/activity-certs" className="docs-link">
            Activity Cert
          </Link>
          .
        </li>
      </ul>
      <p className="docs-text">
        These records are openly verifiable and provide a tamper-evident audit
        trail of what the community decided.
      </p>
    </>
  );
}
