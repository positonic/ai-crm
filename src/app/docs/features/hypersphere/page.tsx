import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function HyperspherePage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Hypersphere Intelligence</h1>
      <p className="docs-page-subtitle">
        Live network data from the Hypersphere ecosystem, surfaced across the
        platform as stats, feeds, profile enrichment, and AI context.
      </p>

      <h2 id="overview" className="docs-heading-h2">
        Overview
      </h2>
      <p className="docs-text">
        The Hypersphere integration connects the platform to the{" "}
        <a
          href="https://www.hyperscan.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="docs-link"
        >
          Hyperscan
        </a>{" "}
        API, pulling real-time data about hypercerts, biodiversity records,
        reviews, and badges published on the decentralised AT Protocol network.
        This data appears in three places: the Impact page, user profiles, and
        the AI assistant.
      </p>

      <h2 id="network-stats-and-feed" className="docs-heading-h2">
        Network Stats &amp; Feed
      </h2>
      <p className="docs-text">
        On any event&apos;s <strong>Impact</strong> page, the{" "}
        <strong>Hypersphere</strong> tab shows:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Stats Cards</strong> &ndash; Four cards displaying live counts
          for Hypercerts, Biodiversity Records, Reviews, and Badges across the
          network.
        </li>
        <li>
          <strong>Network Feed</strong> &ndash; A live feed of recent activity
          including new hypercerts, biodiversity observations, and contributor
          updates. You can filter the feed by type using the dropdown.
        </li>
      </ul>

      <h3 id="how-to-access" className="docs-heading-h3">
        How to Access
      </h3>
      <ol className="docs-list">
        <li>
          Navigate to any event page and click the <strong>Impact</strong> tab.
        </li>
        <li>
          Select the <strong>Hypersphere</strong> sub-tab.
        </li>
        <li>
          Stats load automatically. Use the type filter to narrow the feed.
        </li>
      </ol>

      <h2 id="profile-enrichment" className="docs-heading-h2">
        Profile Enrichment
      </h2>
      <p className="docs-text">
        Users who have connected their AT Protocol (Bluesky) account will see a{" "}
        <strong>Hypersphere Activity</strong> card on their profile page. This
        card displays:
      </p>
      <ul className="docs-list">
        <li>Collections the user has published to</li>
        <li>Recent records they have created</li>
        <li>Follower count on the network</li>
      </ul>
      <p className="docs-text">
        If a user has not connected their AT Protocol account, the card does not
        appear. Users can connect their account from the{" "}
        <Link href="/docs/get-started/your-account" className="docs-link">
          Account Settings
        </Link>{" "}
        page.
      </p>

      <h2 id="ai-chat-context" className="docs-heading-h2">
        AI Chat Context
      </h2>
      <p className="docs-text">
        The platform&apos;s AI assistant automatically receives Hypersphere
        context in every conversation. This includes:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Network statistics</strong> &ndash; Current totals for
          hypercerts, biodiversity records, reviews, and badges.
        </li>
        <li>
          <strong>Recent feed</strong> &ndash; The latest activity from the
          Hypersphere network.
        </li>
        <li>
          <strong>Personal profile</strong> &ndash; If you have connected your AT
          Protocol account, the AI also has access to your personal Hypersphere
          activity.
        </li>
      </ul>
      <p className="docs-text">
        Try asking the assistant questions like &ldquo;What&apos;s happening on
        the Hypersphere network?&rdquo; or &ldquo;How many hypercerts have been
        created?&rdquo; and it will respond with live data.
      </p>

      <h2 id="data-sources" className="docs-heading-h2">
        Data Sources
      </h2>
      <p className="docs-text">
        All Hypersphere data is fetched from the public{" "}
        <a
          href="https://www.hyperscan.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="docs-link"
        >
          Hyperscan
        </a>{" "}
        API. The platform caches responses to keep pages fast:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Network stats</strong> &ndash; Cached for 5 minutes.
        </li>
        <li>
          <strong>Feed items</strong> &ndash; Cached for 2 minutes.
        </li>
        <li>
          <strong>Profile data</strong> &ndash; Cached for 5 minutes.
        </li>
      </ul>
      <p className="docs-text">
        No authentication is required to view network stats or the public feed.
        Profile data requires the user to be signed in and to have connected
        their AT Protocol account.
      </p>

      <h2 id="relationship-to-activity-certs" className="docs-heading-h2">
        Relationship to Activity Certs
      </h2>
      <p className="docs-text">
        The Hypersphere intelligence features complement{" "}
        <Link href="/docs/features/activity-certs" className="docs-link">
          Activity Certs
        </Link>
        . While Activity Certs let organisers <em>publish</em> impact records to
        the network, the Hypersphere tab lets everyone <em>read</em> what has
        been published across the entire ecosystem &ndash; not just from this
        platform, but from all participants on the Hypersphere network.
      </p>

      <hr className="docs-divider" />

      <p className="docs-text">
        Learn about other features in the{" "}
        <Link href="/docs/features/overview" className="docs-link">
          Features overview
        </Link>
        .
      </p>
    </>
  );
}
