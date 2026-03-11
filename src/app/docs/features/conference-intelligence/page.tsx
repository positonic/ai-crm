import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function ConferenceIntelligencePage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Conference Intelligence</h1>
      <p className="docs-page-subtitle">
        An end-to-end system that captures what a conference community
        collectively cares about &ndash; from what they say, what they vote on,
        and what they tell the AI &ndash; and publishes verifiable results to the
        decentralised web.
      </p>

      <h2 id="overview" className="docs-heading-h2">
        Overview
      </h2>
      <p className="docs-text">
        Conference Intelligence answers three questions for every event:
      </p>
      <ol className="docs-list">
        <li>
          <strong>What matters most</strong> to this community?
        </li>
        <li>
          <strong>What are the key blockers</strong> preventing progress?
        </li>
        <li>
          <strong>Where should resources go</strong> &ndash; funding, talent,
          tooling?
        </li>
      </ol>
      <p className="docs-text">
        It does this by merging two types of signal &ndash;{" "}
        <strong>automated</strong> (what people actually discussed in sessions)
        and <strong>intentional</strong> (what people explicitly submitted and
        voted on) &ndash; then publishing the results as verifiable records on
        the AT Protocol.
      </p>

      <hr className="docs-divider" />

      <h2 id="data-ingestion" className="docs-heading-h2">
        Data Ingestion
      </h2>
      <p className="docs-text">
        The system accepts data from multiple input channels. All channels feed
        into the same deliberation data model, so the analysis engine sees a
        unified picture regardless of how the data was collected.
      </p>

      <h3 id="transcription-api" className="docs-heading-h3">
        Transcription API
      </h3>
      <p className="docs-text">
        Session transcripts are ingested via a REST API at{" "}
        <code>POST /api/transcription</code>. An external transcription pipeline
        (e.g. Whisper, a live captioning service, or manual transcription)
        produces text and sends it to the platform.
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>eventId</code>
              </td>
              <td>Yes</td>
              <td>The event this transcript belongs to</td>
            </tr>
            <tr>
              <td>
                <code>title</code>
              </td>
              <td>Yes</td>
              <td>
                Session or floor label (e.g. &ldquo;Floor 3 &ndash; Morning
                Session&rdquo;)
              </td>
            </tr>
            <tr>
              <td>
                <code>transcript</code>
              </td>
              <td>Yes</td>
              <td>The full transcript text</td>
            </tr>
            <tr>
              <td>
                <code>summary</code>
              </td>
              <td>No</td>
              <td>Optional pre-generated summary</td>
            </tr>
            <tr>
              <td>
                <code>sourceSessionId</code>
              </td>
              <td>No</td>
              <td>
                External deduplication key. If provided, repeated POSTs with
                the same key will update rather than duplicate.
              </td>
            </tr>
            <tr>
              <td>
                <code>source</code>
              </td>
              <td>No</td>
              <td>
                Origin of the transcript: <code>MANUAL</code>,{" "}
                <code>WHISPER_API</code>, <code>BROWSER</code>,{" "}
                <code>WEBHOOK</code>, or <code>API</code> (default)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="docs-text">
        Authentication uses an <code>x-api-key</code> header validated against
        the <code>TRANSCRIPTION_API_KEY</code> environment variable. This
        enables any external pipeline to push transcripts without needing a user
        session.
      </p>

      <div className="docs-callout">
        <strong>Note:</strong> The platform does not process audio. It only
        accepts text transcripts. Audio transcription happens upstream in your
        pipeline of choice.
      </div>

      <h3 id="participant-web-ui" className="docs-heading-h3">
        Participant Web UI
      </h3>
      <p className="docs-text">
        Accepted attendees interact directly through the{" "}
        <Link href="/docs/features/deliberation" className="docs-link">
          Deliberation
        </Link>{" "}
        page at <code>/events/[event-slug]/deliberation</code>. They can:
      </p>
      <ul className="docs-list">
        <li>Submit priorities with a title and description</li>
        <li>Vote on other attendees&apos; priorities (toggle)</li>
        <li>Flag blockers on any priority</li>
        <li>Suggest resources (funding, talent, tooling)</li>
      </ul>
      <p className="docs-text">
        All submissions are stored in real-time and visible to other attendees
        via 30-second polling.
      </p>

      <h3 id="ai-agent" className="docs-heading-h3">
        AI Agent (Planned)
      </h3>
      <p className="docs-text">
        The platform&apos;s AI chat agent can act as a conversational
        facilitator during events. Rather than requiring attendees to navigate
        to a specific page and fill out forms, the agent meets them where they
        are &ndash; in a chat conversation &ndash; and converts their input
        into structured deliberation data.
      </p>
      <p className="docs-text">Planned capabilities:</p>
      <ul className="docs-list">
        <li>
          <strong>Guided priority capture</strong> &ndash; The agent asks
          open-ended questions like &ldquo;What&apos;s the most important
          challenge your community faces?&rdquo; and converts responses into
          priority submissions.
        </li>
        <li>
          <strong>Blocker elicitation</strong> &ndash; Follow-up questions
          surface obstacles: &ldquo;What&apos;s preventing progress on
          that?&rdquo;
        </li>
        <li>
          <strong>Resource suggestion prompts</strong> &ndash; &ldquo;If you
          had unlimited resources, what would you direct them
          toward?&rdquo;
        </li>
        <li>
          <strong>Context-aware facilitation</strong> &ndash; The agent knows
          the event schedule, existing priorities, and topic clusters, so it
          can ask targeted questions relevant to each attendee&apos;s
          sessions.
        </li>
      </ul>

      <h3 id="telegram-integration" className="docs-heading-h3">
        Telegram Integration (Planned)
      </h3>
      <p className="docs-text">
        Many FtC events use Telegram groups for real-time coordination. A
        Telegram bot integration would allow attendees to contribute without
        leaving their primary communication channel:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Priority submission</strong> &ndash; A{" "}
          <code>/priority</code> command to submit directly from Telegram
        </li>
        <li>
          <strong>Quick polls</strong> &ndash; Bot-generated polls for fast
          voting on top priorities
        </li>
        <li>
          <strong>Status updates</strong> &ndash; Periodic messages showing
          current top priorities and vote counts
        </li>
        <li>
          <strong>AI-facilitated prompts</strong> &ndash; The same guided
          facilitation from the web agent, delivered through Telegram DMs
        </li>
      </ul>

      <hr className="docs-divider" />

      <h2 id="analysis-pipeline" className="docs-heading-h2">
        Analysis Pipeline
      </h2>
      <p className="docs-text">
        Once data is collected from all channels, the analysis pipeline
        processes it in two stages:
      </p>

      <h3 id="topic-clustering" className="docs-heading-h3">
        1. Topic Clustering
      </h3>
      <p className="docs-text">
        All ingested transcripts are sent to GPT-4o, which extracts 5&ndash;20
        recurring topic clusters. Each cluster includes a label, keywords, an
        estimated mention count, and representative quotes from the transcripts.
        This represents the <strong>automated signal</strong> &ndash; what
        people actually talked about.
      </p>

      <h3 id="signal-merging" className="docs-heading-h3">
        2. Signal Merging &amp; Classification
      </h3>
      <p className="docs-text">
        The analysis engine merges the automated signal (topic clusters) with
        the intentional signal (submitted priorities + votes) and classifies
        each priority:
      </p>
      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Classification</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Convergent</strong>
              </td>
              <td>
                Highly voted <em>and</em> matches a prominent transcript topic.
                Strongest community signal.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Blind Spot</strong>
              </td>
              <td>
                Heavily discussed in sessions but not submitted as a priority.
                The community cares but hasn&apos;t formally named it.
              </td>
            </tr>
            <tr>
              <td>
                <strong>Aspirational</strong>
              </td>
              <td>
                Voted on but not discussed in transcripts. Forward-looking goals
                the community wants to pursue.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="docs-text">
        The engine also groups blockers by theme, compiles resource
        recommendations by category, and generates a narrative synthesis
        answering the three core questions.
      </p>

      <hr className="docs-divider" />

      <h2 id="publication" className="docs-heading-h2">
        Publication to AT Protocol
      </h2>
      <p className="docs-text">
        Results are published as four verifiable records on the AT Protocol
        (the decentralised network behind Bluesky):
      </p>
      <ol className="docs-list">
        <li>
          <strong>
            <code>org.dds.result.summary</code>
          </strong>{" "}
          &ndash; The full deliberation results including ranked priorities,
          blind spots, blocker themes, resource recommendations, and narrative
          synthesis.
        </li>
        <li>
          <strong>
            <code>org.dds.result.pca</code>
          </strong>{" "}
          &ndash; The topic clustering analysis with all clusters, keywords,
          and source excerpts.
        </li>
        <li>
          <strong>
            <code>org.hypercerts.claim.activity</code>
          </strong>{" "}
          &ndash; A Hypercerts activity record listing all participants as
          contributors.
        </li>
        <li>
          <strong>
            <code>org.hyperboards.board</code>
          </strong>{" "}
          &ndash; A hyperboard linking back to the activity record for display.
        </li>
      </ol>
      <p className="docs-text">
        Each record includes an <code>inputHash</code> (SHA-256 of the input
        data) for tamper-evidence. Anyone can verify that the published results
        correspond to the actual input data.
      </p>

      <div className="docs-callout">
        <strong>DDS</strong> stands for{" "}
        <strong>Decentralised Deliberation Standard</strong>. It defines a
        three-phase lifecycle (Plan &rarr; Collect &rarr; Analyse) and
        standardised record formats for publishing deliberation results on
        decentralised networks.
      </div>

      <hr className="docs-divider" />

      <h2 id="admin-workflow" className="docs-heading-h2">
        Admin Workflow
      </h2>
      <p className="docs-text">
        Event organisers manage the full pipeline from the Admin Panel:
      </p>
      <ol className="docs-list">
        <li>
          <strong>Create</strong> a deliberation and enable the feature flag
        </li>
        <li>
          <strong>Collect</strong> &ndash; Attendees submit priorities; external
          pipelines push transcripts
        </li>
        <li>
          <strong>Run Clustering</strong> &ndash; Extract topic clusters from
          transcripts (can run during or after collection)
        </li>
        <li>
          <strong>Close</strong> submissions when ready
        </li>
        <li>
          <strong>Run Analysis</strong> &ndash; Merge signals and classify
          priorities
        </li>
        <li>
          <strong>Publish to AT Protocol</strong> &ndash; Create DDS records
          on the decentralised network
        </li>
      </ol>
      <p className="docs-text">
        Each step shows real-time statistics (priority count, votes,
        transcripts, topic clusters) and the current lifecycle status.
      </p>

      <hr className="docs-divider" />

      <h2 id="integration-points" className="docs-heading-h2">
        Integration Points
      </h2>
      <p className="docs-text">
        The Conference Intelligence system connects to several other platform
        features:
      </p>
      <ul className="docs-list">
        <li>
          <Link href="/docs/features/deliberation" className="docs-link">
            Deliberation
          </Link>{" "}
          &ndash; The participant-facing priority submission and voting
          interface.
        </li>
        <li>
          <Link href="/docs/features/activity-certs" className="docs-link">
            Activity Certs
          </Link>{" "}
          &ndash; Published results include a Hypercerts activity record
          crediting all participants.
        </li>
        <li>
          <Link href="/docs/features/schedule" className="docs-link">
            Schedule
          </Link>{" "}
          &ndash; Transcripts can link to specific sessions and venues for
          context.
        </li>
        <li>
          <Link href="/docs/features/events" className="docs-link">
            Events
          </Link>{" "}
          &ndash; The <code>featureDeliberation</code> flag on events gates
          the entire system.
        </li>
      </ul>

      <h2 id="related-pages" className="docs-heading-h2">
        Related Pages
      </h2>
      <ul className="docs-list">
        <li>
          <Link href="/docs/features/deliberation" className="docs-link">
            Deliberation
          </Link>{" "}
          &ndash; Attendee-facing priority submission and voting
        </li>
        <li>
          <Link href="/docs/organizers/admin-panel" className="docs-link">
            Admin Panel
          </Link>{" "}
          &ndash; Managing deliberations and running the analysis pipeline
        </li>
      </ul>
    </>
  );
}
