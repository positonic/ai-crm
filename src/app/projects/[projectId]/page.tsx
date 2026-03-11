import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { auth } from "~/server/auth";
import ProjectDetailClient from "./ProjectDetailClient";

interface PageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectId } = await params;
  const session = await auth();

  try {
    // Get project details without event context
    const project = await api.project.getProjectDetails({
      projectId,
    });

    if (!project) {
      notFound();
    }

    // Get project timeline updates and transform null to undefined
    const timelineRaw = await api.project.getProjectTimeline({
      projectId,
    });

    // Transform weekNumber from null to undefined for type compatibility
    const timeline = timelineRaw.map((update) => ({
      ...update,
      weekNumber: update.weekNumber ?? undefined,
    }));
    // Check if current user is the project owner
    const isOwner = session?.user?.id === project.author.id;

    return (
      <ProjectDetailClient
        project={project}
        timeline={timeline}
        isOwner={isOwner}
        userId={session?.user?.id}
      />
    );
  } catch (error) {
    console.error("Error loading project details:", error);
    notFound();
  }
}
