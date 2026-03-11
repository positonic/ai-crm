import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function ProjectsPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Projects</h1>
      <p className="docs-page-subtitle">
        Create, track, and showcase the work you build during events.
      </p>

      <h2 id="what-are-projects" className="docs-heading-h2">
        What Are Projects?
      </h2>
      <p className="docs-text">
        Projects are pieces of work that participants create during an event.
        Whether you are building software, writing a research paper, or
        developing a new idea, projects give you a place to document your
        progress and share it with the community.
      </p>

      <h2 id="creating-a-project" className="docs-heading-h2">
        Creating a Project
      </h2>
      <p className="docs-text">
        From the event page, navigate to the Projects section and click
        &ldquo;Create Project&rdquo;. You will be asked to give your project a
        name and description. You can also link a code repository if your
        project involves software.
      </p>

      <h2 id="tracking-progress" className="docs-heading-h2">
        Tracking Progress
      </h2>
      <p className="docs-text">
        As your project develops, you can post timeline updates to document
        milestones, breakthroughs, and lessons learned. These updates create a
        living record of your journey that others can follow along with.
      </p>

      <h2 id="collaboration" className="docs-heading-h2">
        Collaboration
      </h2>
      <p className="docs-text">
        Projects can have multiple team members. Invite others to join your
        project so that everyone on your team can post updates and contribute to
        the project page.
      </p>

      <h2 id="showcasing-your-work" className="docs-heading-h2">
        Showcasing Your Work
      </h2>
      <p className="docs-text">
        All projects are visible to other event participants, making it easy to
        discover what others are working on and find opportunities to
        collaborate or offer help.
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
