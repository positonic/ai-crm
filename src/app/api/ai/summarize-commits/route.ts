import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { auth } from "~/server/auth";

export const dynamic = "force-dynamic";

interface CommitData {
  hash: string;
  datetime: string;
  message: string;
}

interface RequestBody {
  commits: CommitData[];
  projectName: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const { commits, projectName } = body;

    if (!commits || commits.length === 0) {
      return NextResponse.json(
        { error: "No commits provided" },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key is missing for commit summarization");
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey });

    // Format commits for the prompt
    const commitList = commits
      .map((c) => `- ${c.hash}: ${c.message}`)
      .join("\n");

    const prompt = `You are a helpful assistant that summarizes git commit history into a project update.

Project Name: ${projectName}

Git Commits (${commits.length} total):
${commitList}

Based on these commits, generate a concise project update with:
1. A short, descriptive title (max 60 characters) that summarizes the main changes
2. A description (2-4 sentences) that explains what was accomplished, written in first person plural ("We implemented...", "We fixed...")

The title should be action-oriented (e.g., "Implemented user authentication", "Fixed performance issues", "Added new dashboard features").

The description should:
- Highlight the most significant changes
- Be written for a non-technical audience when possible
- Focus on user-facing improvements or business value

Respond in JSON format:
{
  "title": "...",
  "description": "..."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates concise project update summaries from git commit history. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content) as {
      title: string;
      description: string;
    };

    return NextResponse.json({
      title: result.title,
      description: result.description,
    });
  } catch (error) {
    console.error("Error summarizing commits:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 },
    );
  }
}
