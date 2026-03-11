/**
 * Utility functions for handling UserProject and Repository data
 */

import type { UserProject, Repository } from "@prisma/client";

export type ProjectWithRepositories = UserProject & {
  repositories?: Repository[];
};

/**
 * Get the primary repository URL from a project
 * Falls back to legacy githubUrl field if no repositories exist
 */
export function getPrimaryRepoUrl(
  project: ProjectWithRepositories | null | undefined,
): string | null {
  if (!project) return null;

  // Try to find primary repository
  const primaryRepo = project.repositories?.find((r) => r.isPrimary);
  if (primaryRepo?.url) return primaryRepo.url;

  // If no primary but has repositories, use first one
  const firstRepo = project.repositories?.[0];
  if (firstRepo?.url) return firstRepo.url;

  // Fall back to legacy githubUrl field
  return project.githubUrl ?? null;
}

/**
 * Get all repository URLs from a project
 * Includes legacy githubUrl if no repositories exist
 */
export function getAllRepoUrls(
  project: ProjectWithRepositories | null | undefined,
): string[] {
  if (!project) return [];

  // If has repositories, return those
  if (project.repositories && project.repositories.length > 0) {
    const repos = project.repositories;
    return repos
      .filter((r) => r.url)
      .map((r) => r.url)
      .sort((a, b) => {
        // Sort by isPrimary, then order
        const aRepo = repos.find((r) => r.url === a);
        const bRepo = repos.find((r) => r.url === b);

        if (aRepo?.isPrimary && !bRepo?.isPrimary) return -1;
        if (!aRepo?.isPrimary && bRepo?.isPrimary) return 1;

        return (aRepo?.order ?? 0) - (bRepo?.order ?? 0);
      });
  }

  // Fall back to legacy githubUrl
  return project.githubUrl ? [project.githubUrl] : [];
}

/**
 * Get the primary repository from a project
 * Returns the primary repo, or first repo, or null
 */
export function getPrimaryRepo(
  project: ProjectWithRepositories | null | undefined,
): Repository | null {
  if (!project?.repositories || project.repositories.length === 0) {
    return null;
  }

  // Try to find primary repository
  const primaryRepo = project.repositories.find((r) => r.isPrimary);
  if (primaryRepo) return primaryRepo;

  // If no primary, return first repository (sorted by order)
  const sortedRepos = [...project.repositories].sort(
    (a, b) => a.order - b.order,
  );
  return sortedRepos[0] ?? null;
}

/**
 * Check if a project has multiple repositories
 */
export function hasMultipleRepos(
  project: ProjectWithRepositories | null | undefined,
): boolean {
  if (!project) return false;

  const repoCount = project.repositories?.length ?? 0;

  // If has multiple repos in new structure
  if (repoCount > 1) return true;

  // If has one repo in new structure and legacy githubUrl (edge case during migration)
  if (repoCount === 1 && project.githubUrl && project.repositories) {
    const repoUrl = project.repositories[0]?.url;
    return repoUrl !== project.githubUrl;
  }

  return false;
}

/**
 * Get a display label for a repository
 * Returns the name if available, otherwise extracts from URL
 */
export function getRepoDisplayName(repository: Repository): string {
  if (repository.name) return repository.name;

  try {
    const url = new URL(repository.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // GitHub URLs typically: /owner/repo
    if (pathParts.length >= 2) {
      return pathParts[1] ?? "Repository";
    }

    return "Repository";
  } catch {
    return "Repository";
  }
}

/**
 * Sort repositories by primary status and order
 */
export function sortRepositories(repositories: Repository[]): Repository[] {
  return [...repositories].sort((a, b) => {
    // Primary repos first
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;

    // Then by order
    if (a.order !== b.order) return a.order - b.order;

    // Finally by creation date
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
