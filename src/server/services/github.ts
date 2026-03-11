/**
 * GitHub Service
 *
 * Handles GitHub API interactions for repository activity tracking
 */

import { Octokit } from "@octokit/rest";
import { env } from "~/env";

interface CommitDataPoint {
  date: string;
  count: number;
}

interface RepositoryActivity {
  lastCommitDate: Date | null;
  firstCommitDate: Date | null;
  totalCommits: number;
  isActive: boolean;
  weeksActive: number | null;
  commitsData: CommitDataPoint[];
}

interface ResidencyActivity {
  commitsData: CommitDataPoint[];
  residencyCommits: number;
}

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    if (!env.GITHUB_API_TOKEN) {
      throw new Error("GITHUB_API_TOKEN environment variable is required");
    }

    this.octokit = new Octokit({
      auth: env.GITHUB_API_TOKEN,
    });
  }

  /**
   * Fetch lifetime activity for a repository
   */
  async fetchRepositoryActivity(repoUrl: string): Promise<RepositoryActivity> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);

    try {
      // Fetch latest commit
      const latestCommitResponse = await this.octokit.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      });

      // Fetch repository data for creation date
      const repoData = await this.octokit.repos.get({ owner, repo });

      // Fetch commit activity stats (last year of weekly activity)
      const commitActivityResponse =
        await this.octokit.repos.getCommitActivityStats({
          owner,
          repo,
        });

      // Process latest commit
      const latestCommit = latestCommitResponse.data[0];
      const lastCommitDate = latestCommit?.commit.committer?.date
        ? new Date(latestCommit.commit.committer.date)
        : null;

      // Use repository creation date as first commit approximation
      const firstCommitDate = new Date(repoData.data.created_at);

      // Check if active (commits in last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const isActive = lastCommitDate ? lastCommitDate > thirtyDaysAgo : false;

      // Calculate weeks active
      const weeksActive =
        lastCommitDate && firstCommitDate
          ? (lastCommitDate.getTime() - firstCommitDate.getTime()) /
            (7 * 24 * 60 * 60 * 1000)
          : null;

      // Format commit timeline data from weekly activity
      const commitsData = this.formatCommitActivity(
        commitActivityResponse.data,
      );
      const totalCommits = commitsData.reduce((sum, d) => sum + d.count, 0);

      return {
        lastCommitDate,
        firstCommitDate,
        totalCommits,
        isActive,
        weeksActive,
        commitsData,
      };
    } catch (error) {
      console.error(`Error fetching activity for ${repoUrl}:`, error);
      throw new Error(
        `Failed to fetch repository activity: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Fetch commits within a specific date range (for residency period)
   */
  async fetchResidencyActivity(
    repoUrl: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ResidencyActivity> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);

    try {
      // Fetch all commits within the date range
      // Note: GitHub API paginates at 100 per page
      const commits = await this.octokit.paginate(
        this.octokit.repos.listCommits,
        {
          owner,
          repo,
          since: startDate.toISOString(),
          until: endDate.toISOString(),
          per_page: 100,
        },
      );

      // Group commits by date
      const commitsByDate = new Map<string, number>();
      for (const commit of commits) {
        const commitDate = commit.commit.committer?.date;
        if (commitDate) {
          const date = commitDate.split("T")[0]; // Get YYYY-MM-DD
          if (date) {
            commitsByDate.set(date, (commitsByDate.get(date) ?? 0) + 1);
          }
        }
      }

      // Convert to array and sort by date
      const commitsData = Array.from(commitsByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        commitsData,
        residencyCommits: commits.length,
      };
    } catch (error) {
      console.error(`Error fetching residency activity for ${repoUrl}:`, error);
      throw new Error(
        `Failed to fetch residency activity: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Parse GitHub repository URL to extract owner and repo name
   */
  private parseRepoUrl(url: string): { owner: string; repo: string } {
    // Handle different GitHub URL formats:
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git

    let cleanUrl = url;

    // Convert SSH URLs to HTTPS format for parsing
    if (url.startsWith("git@github.com:")) {
      cleanUrl = url.replace("git@github.com:", "https://github.com/");
    }

    const regex = /github\.com[\/:]([^\/]+)\/([^\/]+?)(?:\.git)?$/;
    const match = regex.exec(cleanUrl);
    if (!match?.[1] || !match?.[2]) {
      throw new Error(`Invalid GitHub URL: ${url}`);
    }

    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ""),
    };
  }

  /**
   * Format GitHub's commit activity stats into our timeline format
   */
  private formatCommitActivity(
    data:
      | Array<{ week: number; total: number; days: number[] }>
      | Record<string, never>,
  ): CommitDataPoint[] {
    const points: CommitDataPoint[] = [];

    // Handle empty response object
    if (!Array.isArray(data)) {
      return points;
    }

    for (const week of data) {
      // Convert Unix timestamp to date
      const weekDate = new Date(week.week * 1000);

      // Add each day of the week
      week.days.forEach((count, dayIndex) => {
        if (count > 0) {
          const date = new Date(weekDate);
          date.setDate(date.getDate() + dayIndex);
          points.push({
            date: date.toISOString().split("T")[0] ?? "",
            count,
          });
        }
      });
    }

    return points.sort((a, b) => a.date.localeCompare(b.date));
  }
}
