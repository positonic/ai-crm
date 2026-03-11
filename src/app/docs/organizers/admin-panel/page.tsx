import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function AdminPanelPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Admin Panel</h1>
      <p className="docs-page-subtitle">
        A complete overview of the tools available to event organisers.
      </p>

      <h2 id="accessing-the-admin-panel" className="docs-heading-h2">
        Accessing the Admin Panel
      </h2>
      <p className="docs-text">
        The admin panel is available to users with organiser or admin
        permissions. You can access it from the main navigation or by visiting
        the admin section directly. If you believe you should have access but do
        not see it, contact a platform administrator.
      </p>

      <h2 id="managing-events" className="docs-heading-h2">
        Managing Events
      </h2>
      <p className="docs-text">
        From the admin panel, you can create new events, edit existing ones, and
        control every aspect of your conference. This includes setting dates,
        locations, descriptions, and capacity limits.
      </p>

      <h3 id="feature-flags" className="docs-heading-h3">
        Feature Flags
      </h3>
      <p className="docs-text">
        Each event has a set of feature flags that let you enable or disable
        specific functionality. For example, you can turn on{" "}
        <Link href="/docs/features/floor-management" className="docs-link">
          schedule management
        </Link>{" "}
        for venue partners, enable project showcases, or control which sections
        are visible to participants.
      </p>

      <h2 id="reviewing-applications" className="docs-heading-h2">
        Reviewing Applications
      </h2>
      <p className="docs-text">
        The applications section shows all submissions for your event. You can
        filter by status, review individual responses, and make decisions. The
        platform supports both individual and bulk status updates &ndash; you
        can accept, waitlist, or decline multiple applicants at once.
      </p>
      <p className="docs-text">
        When you change an application&apos;s status, the applicant is
        automatically notified by email. No manual follow-up is required.
      </p>

      <h2 id="managing-the-schedule" className="docs-heading-h2">
        Managing the Schedule
      </h2>
      <p className="docs-text">
        Organisers have full control over the event schedule. You can create
        venues, add sessions, assign times and speakers, and publish the
        schedule when it is ready. You can also delegate this work to venue
        partners by assigning them as{" "}
        <Link href="/docs/organizers/floor-owners" className="docs-link">
          floor leads
        </Link>
        .
      </p>

      <h2 id="sending-invitations" className="docs-heading-h2">
        Sending Invitations
      </h2>
      <p className="docs-text">
        From the admin panel, you can send{" "}
        <Link href="/docs/features/invitations" className="docs-link">
          invitations
        </Link>{" "}
        to bring people into your event with specific roles. Invitations are
        sent by email and tracked within the platform so you always know who has
        accepted and who is still pending.
      </p>

      <h2 id="monitoring-participants" className="docs-heading-h2">
        Monitoring Participants
      </h2>
      <p className="docs-text">
        The participants section gives you a view of everyone involved in your
        event. You can see their status, role, and any projects they are working
        on. This helps you keep a pulse on the event and offer support where
        needed.
      </p>

      <hr className="docs-divider" />

      <p className="docs-text">
        For help with delegating venue management, see{" "}
        <Link href="/docs/organizers/floor-owners" className="docs-link">
          Managing Floor Leads
        </Link>
        .
      </p>
    </>
  );
}
