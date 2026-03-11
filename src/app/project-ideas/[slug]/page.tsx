import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProjectDetailClient } from "./ProjectDetailClient";
import { createCaller } from "~/server/api/root";
import { db } from "~/server/db";

interface ProjectDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const caller = createCaller({ headers: new Headers(), db, session: null });
  const resolvedParams = await params;

  try {
    const project = await caller.projectIdea.getBySlug({
      slug: resolvedParams.slug,
    });

    return {
      title: `${project.title} | Project Ideas | Funding the Commons`,
      description:
        project.description ??
        `Explore ${project.title} - an innovative blockchain project idea from our community.`,
      openGraph: {
        title: `${project.title} | Funding the Commons`,
        description:
          project.description ??
          `Explore ${project.title} - an innovative blockchain project idea from our community.`,
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: `${project.title} | Funding the Commons`,
        description:
          project.description ??
          `Explore ${project.title} - an innovative blockchain project idea from our community.`,
      },
    };
  } catch {
    return {
      title: "Project Not Found | Funding the Commons",
      description: "The requested project idea could not be found.",
    };
  }
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  // Pre-fetch the project on the server to check if it exists
  const caller = createCaller({ headers: new Headers(), db, session: null });
  const resolvedParams = await params;

  try {
    await caller.projectIdea.getBySlug({ slug: resolvedParams.slug });
  } catch {
    // If project doesn't exist, return 404
    notFound();
  }

  return <ProjectDetailClient slug={resolvedParams.slug} />;
}

// Generate static params for better performance (optional)
export async function generateStaticParams() {
  try {
    const caller = createCaller({ headers: new Headers(), db, session: null });
    const projects = await caller.projectIdea.getAll({
      limit: 100, // Limit to avoid overwhelming builds
      offset: 0,
    });

    return projects.projects.map((project) => ({
      slug: project.slug,
    }));
  } catch {
    // Return empty array if there's an error
    return [];
  }
}
