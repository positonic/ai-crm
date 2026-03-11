import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Parse GitHub URL to extract owner and repo
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    // Handle various GitHub URL formats
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    const regex = /github\.com[/:]([\w-]+)\/([\w-]+?)(?:\.git)?$/;
    const match = regex.exec(url);
    if (!match) return null;

    return {
      owner: match[1]!,
      repo: match[2]!,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const githubUrl = searchParams.get("repo");
    const sinceParam = searchParams.get("since");
    const untilParam = searchParams.get("until");

    if (!githubUrl) {
      return NextResponse.json({
        success: false,
        commits: [],
        error: "No repository URL provided",
      });
    }

    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
      return NextResponse.json({
        success: false,
        commits: [],
        error: "Invalid GitHub repository URL",
      });
    }

    // Fetch commits from GitHub API with optional date range
    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const until = untilParam ? new Date(untilParam) : new Date();

    let githubApiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?since=${since.toISOString()}&per_page=100`;
    if (untilParam) {
      githubApiUrl += `&until=${until.toISOString()}`;
    }

    const response = await fetch(githubApiUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        // Add GitHub token if available for higher rate limits
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          success: false,
          commits: [],
          error: "Repository not found or not accessible",
        });
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = (await response.json()) as Array<{
      sha: string;
      commit: {
        message: string;
        author: {
          date: string;
        };
      };
    }>;

    // Transform GitHub API response to our format
    const commits = data.map((item) => {
      const date = new Date(item.commit.author.date);
      const formattedDate = date.toISOString().split("T")[0];
      const formattedTime = date.toTimeString().split(" ")[0];

      return {
        hash: item.sha.substring(0, 7),
        datetime: `${formattedDate ?? ""} ${formattedTime ?? ""}`,
        message: item.commit.message.split("\n")[0] ?? "", // First line only
      };
    });

    return NextResponse.json({
      success: true,
      commits,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching git commits:", error);

    return NextResponse.json({
      success: false,
      commits: [],
      error: "Unable to fetch commit history",
    });
  }
}
