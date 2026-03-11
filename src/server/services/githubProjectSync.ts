import { type PrismaClient } from "@prisma/client";
import { SyncStatus } from "@prisma/client";

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  download_url: string;
}

export interface GitHubApiResponse {
  tree: GitHubFile[];
  sha: string;
}

export interface ProjectMetadata {
  title: string;
  description?: string;
  technologies: string[];
  difficulty?: string;
  category?: string;
}

/**
 * GitHub API service for fetching and syncing project ideas
 */
export class GitHubProjectSyncService {
  private readonly baseUrl = "https://api.github.com";
  private readonly repoOwner = "fundingthecommons";
  private readonly repoName = "project-ideas";
  private readonly projectsPath = "projects";

  constructor(private readonly db: PrismaClient) {}

  /**
   * Fetch list of project files from GitHub API
   */
  async fetchProjectList(): Promise<GitHubFile[]> {
    const url = `${this.baseUrl}/repos/${this.repoOwner}/${this.repoName}/git/trees/main?recursive=1`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "FTC-Platform/1.0",
    };

    // Add GitHub token if available for higher rate limits
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GitHubApiResponse;

    // Filter for .md files in the projects directory and extract filename
    return data.tree
      .filter(
        (file) =>
          file.path.startsWith(`${this.projectsPath}/`) &&
          file.path.endsWith(".md") &&
          !file.path.endsWith("README.md"),
      )
      .map((file) => ({
        ...file,
        name: file.path.split("/").pop() ?? "unknown.md", // Extract filename from path
      }));
  }

  /**
   * Fetch raw content of a specific project file
   */
  async fetchProjectContent(filename: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/main/${this.projectsPath}/${filename}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${filename}: ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  /**
   * Parse project metadata from markdown content
   */
  parseProjectMetadata(content: string, filename: string): ProjectMetadata {
    const lines = content.split("\n");

    // Extract title from first heading
    const titleMatch = lines.find((line) => line.startsWith("# "));
    const title = titleMatch
      ? titleMatch.replace(/^# /, "").trim()
      : filename.replace(".md", "").replace(/-/g, " ");

    // Extract description from first paragraph after title
    let description: string | undefined;
    let foundTitle = false;
    for (const line of lines) {
      if (line.startsWith("# ")) {
        foundTitle = true;
        continue;
      }
      if (
        foundTitle &&
        line.trim() &&
        !line.startsWith("#") &&
        !line.startsWith("##")
      ) {
        description = line.trim();
        break;
      }
    }

    // Extract technologies from content
    const technologies = this.extractTechnologies(content);

    // Extract difficulty and category from content patterns
    const difficulty = this.extractDifficulty(content);
    const category = this.extractCategory(content, filename);

    return {
      title,
      description,
      technologies,
      difficulty,
      category,
    };
  }

  /**
   * Extract technology stack from markdown content
   */
  private extractTechnologies(content: string): string[] {
    const technologies = new Set<string>();
    const contentLower = content.toLowerCase();

    // Blockchain platforms
    const blockchainTech = [
      "ethereum",
      "polygon",
      "arbitrum",
      "optimism",
      "base",
      "eigenlayer",
      "avalanche",
      "solana",
      "cosmos",
      "polkadot",
      "near",
      "flow",
      "miden",
      "aztec",
      "starknet",
      "zksync",
      "scroll",
    ];

    // Programming languages
    const languages = [
      "solidity",
      "typescript",
      "javascript",
      "rust",
      "go",
      "python",
      "cairo",
      "move",
      "vyper",
    ];

    // Frameworks and libraries
    const frameworks = [
      "next.js",
      "react",
      "vue",
      "angular",
      "node.js",
      "express",
      "hardhat",
      "foundry",
      "truffle",
      "wagmi",
      "viem",
      "ethers",
      "web3.js",
      "thirdweb",
      "rainbowkit",
    ];

    // Infrastructure and tools
    const infrastructure = [
      "ipfs",
      "the graph",
      "chainlink",
      "gelato",
      "biconomy",
      "alchemy",
      "infura",
      "moralis",
      "tenderly",
      "defender",
    ];

    // DeFi protocols
    const defiProtocols = [
      "uniswap",
      "aave",
      "compound",
      "makerdao",
      "curve",
      "balancer",
      "sushi",
      "1inch",
      "yearn",
      "lido",
    ];

    const allTech = [
      ...blockchainTech,
      ...languages,
      ...frameworks,
      ...infrastructure,
      ...defiProtocols,
    ];

    for (const tech of allTech) {
      if (contentLower.includes(tech.toLowerCase())) {
        // Capitalize properly
        technologies.add(tech.charAt(0).toUpperCase() + tech.slice(1));
      }
    }

    // Look for technology sections in markdown
    const techSectionRegex =
      /(?:technologies?|tech stack|built with)[:\s]*([^\n]*(?:\n(?!\n|#)[^\n]*)*)/gi;
    const techMatches = content.match(techSectionRegex);

    if (techMatches) {
      for (const match of techMatches) {
        const techList = match.replace(
          /(?:technologies?|tech stack|built with)[:\s]*/gi,
          "",
        );
        const techs = techList
          .split(/[,\n-•]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        techs.forEach((tech) => {
          if (tech.length > 0 && tech.length < 30) {
            // Reasonable tech name length
            technologies.add(tech);
          }
        });
      }
    }

    return Array.from(technologies).slice(0, 10); // Limit to 10 technologies
  }

  /**
   * Extract difficulty level from content
   */
  private extractDifficulty(content: string): string | undefined {
    const contentLower = content.toLowerCase();

    if (
      contentLower.includes("beginner") ||
      contentLower.includes("easy") ||
      contentLower.includes("simple")
    ) {
      return "Easy";
    }
    if (
      contentLower.includes("advanced") ||
      contentLower.includes("complex") ||
      contentLower.includes("hard")
    ) {
      return "Hard";
    }
    if (
      contentLower.includes("intermediate") ||
      contentLower.includes("medium")
    ) {
      return "Medium";
    }

    // Default based on content complexity
    const codeBlocks = (content.match(/```/g) ?? []).length / 2;
    const technicalTerms = (
      content.match(
        /\b(?:smart contract|blockchain|cryptography|zero-knowledge|consensus|protocol)\b/gi,
      ) ?? []
    ).length;

    if (codeBlocks > 3 || technicalTerms > 10) return "Hard";
    if (codeBlocks > 1 || technicalTerms > 5) return "Medium";
    return "Easy";
  }

  /**
   * Extract category from content and filename
   */
  private extractCategory(
    content: string,
    filename: string,
  ): string | undefined {
    const contentLower = content.toLowerCase();

    // DeFi keywords
    if (
      contentLower.includes("defi") ||
      contentLower.includes("swap") ||
      contentLower.includes("dex") ||
      contentLower.includes("lending") ||
      contentLower.includes("stablecoin") ||
      filename.includes("swap") ||
      filename.includes("defi") ||
      filename.includes("stablecoin")
    ) {
      return "DeFi";
    }

    // Infrastructure keywords
    if (
      contentLower.includes("infrastructure") ||
      contentLower.includes("protocol") ||
      contentLower.includes("network") ||
      contentLower.includes("node") ||
      filename.includes("protocol") ||
      filename.includes("network")
    ) {
      return "Infrastructure";
    }

    // Privacy keywords
    if (
      contentLower.includes("privacy") ||
      contentLower.includes("private") ||
      contentLower.includes("zero-knowledge") ||
      contentLower.includes("zk") ||
      filename.includes("privacy") ||
      filename.includes("private")
    ) {
      return "Privacy";
    }

    // Payments keywords
    if (
      contentLower.includes("payment") ||
      contentLower.includes("remittance") ||
      contentLower.includes("wallet") ||
      contentLower.includes("pos") ||
      filename.includes("payment") ||
      filename.includes("wallet")
    ) {
      return "Payments";
    }

    // AI keywords
    if (
      contentLower.includes("ai ") ||
      contentLower.includes("artificial intelligence") ||
      contentLower.includes("machine learning") ||
      contentLower.includes("agent") ||
      filename.includes("ai-")
    ) {
      return "AI";
    }

    // Governance keywords
    if (
      contentLower.includes("governance") ||
      contentLower.includes("voting") ||
      contentLower.includes("dao") ||
      filename.includes("governance") ||
      filename.includes("voting")
    ) {
      return "Governance";
    }

    return "Other";
  }

  /**
   * Generate URL-safe slug from title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim()
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Sync a single project from GitHub
   */
  async syncProject(file: GitHubFile): Promise<void> {
    try {
      console.log(`📖 Fetching content for: ${file.name}`);
      const content = await this.fetchProjectContent(file.name);
      console.log(`📝 Content length: ${content.length} characters`);

      const metadata = this.parseProjectMetadata(content, file.name);
      console.log(`🏷️ Parsed metadata for ${file.name}:`, {
        title: metadata.title,
        description: metadata.description?.substring(0, 100) + "...",
        technologies: metadata.technologies,
        difficulty: metadata.difficulty,
        category: metadata.category,
      });

      const slug = this.generateSlug(metadata.title);
      console.log(`🔗 Generated slug: ${slug}`);

      const result = await this.db.projectIdea.upsert({
        where: { slug },
        update: {
          title: metadata.title,
          description: metadata.description,
          content,
          githubPath: file.path,
          technologies: metadata.technologies,
          difficulty: metadata.difficulty,
          category: metadata.category,
          githubSha: file.sha,
          lastSynced: new Date(),
          syncStatus: SyncStatus.SUCCESS,
        },
        create: {
          title: metadata.title,
          slug,
          description: metadata.description,
          content,
          githubPath: file.path,
          technologies: metadata.technologies,
          difficulty: metadata.difficulty,
          category: metadata.category,
          githubSha: file.sha,
          syncStatus: SyncStatus.SUCCESS,
        },
      });
      console.log(
        `💾 Database operation completed for: ${file.name} (ID: ${result.id})`,
      );
    } catch (error) {
      console.error(`💥 Error syncing ${file.name}:`, error);

      // Update sync status to failed for this specific project
      const failedSlug = this.generateSlug(file.name.replace(".md", ""));
      await this.db.projectIdea.upsert({
        where: { slug: failedSlug },
        update: {
          syncStatus: SyncStatus.FAILED,
          lastSynced: new Date(),
        },
        create: {
          title: file.name.replace(".md", ""),
          slug: failedSlug,
          content: "",
          githubPath: file.path,
          technologies: [],
          githubSha: file.sha,
          syncStatus: SyncStatus.FAILED,
        },
      });

      throw error;
    }
  }

  /**
   * Sync all projects from GitHub repository
   */
  async syncAllProjects(): Promise<{
    syncedCount: number;
    failedCount: number;
    totalProjects: number;
  }> {
    // Create sync record
    const syncRecord = await this.db.projectSync.create({
      data: {
        totalProjects: 0,
        syncedCount: 0,
        failedCount: 0,
        status: SyncStatus.SYNCING,
      },
    });

    try {
      console.log("🔄 Starting GitHub sync...");
      const projectFiles = await this.fetchProjectList();
      console.log(
        `📁 Found ${projectFiles.length} project files:`,
        projectFiles.map((f) => f.name),
      );

      // Update sync record with total count
      await this.db.projectSync.update({
        where: { id: syncRecord.id },
        data: { totalProjects: projectFiles.length },
      });

      let syncedCount = 0;
      let failedCount = 0;

      // Process projects in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < projectFiles.length; i += batchSize) {
        const batch = projectFiles.slice(i, i + batchSize);
        console.log(
          `📦 Processing batch ${Math.floor(i / batchSize) + 1}:`,
          batch.map((f) => f.name),
        );

        await Promise.allSettled(
          batch.map(async (file) => {
            try {
              console.log(`🔄 Syncing project: ${file.name}`);
              await this.syncProject(file);
              console.log(`✅ Successfully synced: ${file.name}`);
              syncedCount++;
            } catch (error) {
              console.error(`❌ Failed to sync project ${file.name}:`, error);
              failedCount++;
            }
          }),
        );
      }

      // Update sync record with final status
      await this.db.projectSync.update({
        where: { id: syncRecord.id },
        data: {
          syncedCount,
          failedCount,
          status: SyncStatus.SUCCESS,
          completedAt: new Date(),
        },
      });

      return { syncedCount, failedCount, totalProjects: projectFiles.length };
    } catch (error) {
      // Update sync record with error
      await this.db.projectSync.update({
        where: { id: syncRecord.id },
        data: {
          status: SyncStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Check if a project needs syncing based on GitHub SHA
   */
  async needsSync(file: GitHubFile): Promise<boolean> {
    const existingProject = await this.db.projectIdea.findFirst({
      where: { githubPath: file.path },
      select: { githubSha: true },
    });

    return !existingProject || existingProject.githubSha !== file.sha;
  }

  /**
   * Get sync status and recent sync history
   */
  async getSyncStatus() {
    const [latestSync, recentSyncs, projectCount] = await Promise.all([
      this.db.projectSync.findFirst({
        orderBy: { startedAt: "desc" },
      }),
      this.db.projectSync.findMany({
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
      this.db.projectIdea.count(),
    ]);

    return {
      latestSync,
      recentSyncs,
      projectCount,
    };
  }
}

/**
 * Factory function to create GitHubProjectSyncService instance
 */
export function createGitHubSyncService(db: PrismaClient) {
  return new GitHubProjectSyncService(db);
}
