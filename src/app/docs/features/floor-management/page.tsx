import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function FloorManagementPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Floor Management</h1>
      <p className="docs-page-subtitle">
        Venue partners can manage their own floors, sessions, and spaces
        directly on the platform.
      </p>

      <h2 id="what-is-floor-management" className="docs-heading-h2">
        What Is Floor Management?
      </h2>
      <p className="docs-text">
        Floor management is a feature designed for venue partners &ndash; the
        people and organisations who provide physical spaces for conference
        sessions. Instead of coordinating everything through the event
        organisers, floor leads can log in and manage their own venue directly.
      </p>
      <p className="docs-text">
        This means you can create sessions, update your space&apos;s details,
        and keep your schedule current without waiting for someone else to make
        changes on your behalf.
      </p>

      <h2 id="becoming-a-floor-lead" className="docs-heading-h2">
        Becoming a Floor Lead
      </h2>
      <p className="docs-text">
        Floor leads are assigned by event organisers. There are two ways this
        can happen:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Direct assignment</strong> &ndash; If you already have an
          account on the platform, an organiser can assign you to a specific
          venue from the admin panel.
        </li>
        <li>
          <strong>Email invitation</strong> &ndash; If you are new to the
          platform, the organiser can send you an invitation by email. When you
          accept the invitation and create your account, you will automatically
          be linked to your venue.
        </li>
      </ul>

      <h2 id="accessing-your-floor" className="docs-heading-h2">
        Accessing Your Floor
      </h2>
      <p className="docs-text">
        Once assigned, a new &ldquo;Manage Floors&rdquo; tab will appear in the
        event navigation. Click it to see all the venues you have been assigned
        to. If you manage more than one floor, you can switch between them using
        the tabs at the top of the page.
      </p>

      <div className="docs-callout">
        <p className="docs-callout-text">
          <strong>Cannot see the tab?</strong> The &ldquo;Manage Floors&rdquo;
          tab only appears when the event organiser has enabled schedule
          management for the event. If you expect to see it but do not, contact
          your event organiser.
        </p>
      </div>

      <h2 id="managing-sessions" className="docs-heading-h2">
        Managing Sessions
      </h2>
      <p className="docs-text">From your floor management page, you can:</p>

      <h3 id="create-a-session" className="docs-heading-h3">
        Create a Session
      </h3>
      <p className="docs-text">
        Click the &ldquo;Create Session&rdquo; button to add a new session to
        your floor. You will be asked to provide:
      </p>
      <ul className="docs-list">
        <li>A title for the session</li>
        <li>A description of what will happen</li>
        <li>Start and end times</li>
        <li>Speaker names (separated by commas)</li>
        <li>The type of session (talk, workshop, social, etc.)</li>
        <li>Whether the session should be visible to attendees immediately</li>
      </ul>

      <h3 id="edit-a-session" className="docs-heading-h3">
        Edit a Session
      </h3>
      <p className="docs-text">
        Click the edit button on any existing session to update its details. You
        can change the title, time, speakers, or any other information. Changes
        take effect immediately.
      </p>

      <h3 id="remove-a-session" className="docs-heading-h3">
        Remove a Session
      </h3>
      <p className="docs-text">
        If a session is cancelled or no longer needed, you can remove it from
        your floor&apos;s schedule. Deleted sessions will no longer appear on
        the public schedule.
      </p>

      <h2 id="updating-venue-details" className="docs-heading-h2">
        Updating Venue Details
      </h2>
      <p className="docs-text">
        You can also update your venue&apos;s information, including:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Name</strong> &ndash; The display name for your floor or room.
        </li>
        <li>
          <strong>Description</strong> &ndash; A brief description of the space
          to help attendees know what to expect.
        </li>
        <li>
          <strong>Capacity</strong> &ndash; How many people your space can
          accommodate.
        </li>
      </ul>

      <h2 id="published-vs-draft" className="docs-heading-h2">
        Published vs. Draft Sessions
      </h2>
      <p className="docs-text">
        When you create a session, you can choose whether it is immediately
        visible to attendees or saved as a draft. Draft sessions are only
        visible to you and the event organisers. This lets you plan your
        schedule in advance and publish everything at once when you are ready.
      </p>

      <h2 id="sharing-applications-across-floors" className="docs-heading-h2">
        Sharing Applications Across Floors
      </h2>
      <p className="docs-text">
        Sometimes an applicant is a great fit for your event but not quite right
        for your specific floor. Rather than letting that application go to
        waste, you can share it with the other floors so their leads can review
        it too.
      </p>

      <h3 id="how-sharing-works" className="docs-heading-h3">
        How Sharing Works
      </h3>
      <p className="docs-text">
        When you share an application, it becomes visible to every other floor
        lead within the same event. The application stays linked to your floor
        &ndash; sharing simply opens it up so other leads can see it and
        potentially book that person for their own programme.
      </p>

      <h3 id="sharing-a-single-application" className="docs-heading-h3">
        Sharing a Single Application
      </h3>
      <p className="docs-text">
        Open the application you want to share and click &ldquo;Share with Other
        Floors&rdquo; from the actions menu. The application will be immediately
        visible to all other floor leads. You can reverse this at any time by
        clicking &ldquo;Unshare from Other Floors&rdquo;.
      </p>

      <h3 id="sharing-multiple-applications" className="docs-heading-h3">
        Sharing Multiple Applications at Once
      </h3>
      <p className="docs-text">
        If you have several applications to share, select them using the
        checkboxes and click the &ldquo;Share with Floors&rdquo; button. This
        lets you share a batch of applications in one action.
      </p>

      <h3 id="viewing-shared-applications" className="docs-heading-h3">
        Viewing Shared Applications
      </h3>
      <p className="docs-text">
        Applications that have been shared by other floors will appear alongside
        the applications for your own floor. This means you can review them and
        reach out to the applicant if they would be a good fit for your space.
      </p>

      <div className="docs-callout">
        <p className="docs-callout-text">
          <strong>Good to know:</strong> You can only share applications that
          are linked to your own floor. You cannot share applications that
          belong to another lead&apos;s floor.
        </p>
      </div>

      <h2 id="what-floor-leads-cannot-do" className="docs-heading-h2">
        What Floor Leads Cannot Do
      </h2>
      <p className="docs-text">
        Floor lead access is focused on managing your own space. A few things
        are reserved for event organisers:
      </p>
      <ul className="docs-list">
        <li>Creating or deleting venues (only organisers can do this)</li>
        <li>Assigning other people as floor leads</li>
        <li>Modifying sessions on other people&apos;s floors</li>
        <li>Changing event-level settings</li>
      </ul>
      <p className="docs-text">
        If you need any of these changes, simply contact the event organiser.
      </p>

      <hr className="docs-divider" />

      <h2 id="related-guides" className="docs-heading-h2">
        Related Guides
      </h2>
      <ul className="docs-list">
        <li>
          <Link href="/docs/features/schedule" className="docs-link">
            Schedule
          </Link>{" "}
          &ndash; How the schedule works for attendees.
        </li>
        <li>
          <Link href="/docs/organizers/floor-owners" className="docs-link">
            Managing Floor Leads
          </Link>{" "}
          &ndash; A guide for organisers on assigning and managing floor leads.
        </li>
        <li>
          <Link href="/docs/organizers/admin-panel" className="docs-link">
            Admin Panel
          </Link>{" "}
          &ndash; Full overview of the organiser tools.
        </li>
        <li>
          <Link href="/docs/features/applications" className="docs-link">
            Applications
          </Link>{" "}
          &ndash; How the application process works for applicants.
        </li>
      </ul>
    </>
  );
}
