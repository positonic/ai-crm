import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { ProjectSyncAdminClient } from "./ProjectSyncAdminClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Sync Management | Admin | Funding the Commons",
  description: "Manage synchronization of project ideas from GitHub repository",
};

export default async function ProjectSyncAdminPage() {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Check if user has admin role (role is already extended in auth config)
  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <ProjectSyncAdminClient />;
}
