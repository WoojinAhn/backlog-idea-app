import { NextRequest, NextResponse } from "next/server";
import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const BACKLOG_REPO = "WoojinAhn/backlog";
const BACKLOG_DIR = "~/home/backlog";

const PROMPT_TEMPLATE = (idea: string) => `
You are a backlog issue formatter. Given a raw idea, generate a structured GitHub issue.

Rules:
- Title: 명사형/동명사형 (e.g. ~시스템, ~앱, ~학습, ~작성). No 구어체.
- Title can use 괄호 for context: "Spring Boot 레퍼런스 레포 구축 (이커머스 도메인)"
- Title can use → for transitions: "Vercel → AWS 배포 전환 학습"
- Labels: pick 1+ from: learning, infra, side-project, content, core-skill
- Body format:
  ## 목적
  (clear goal)

  ## 배경
  (optional context, omit section if not needed)

  ## 할 일
  - [ ] action items as checklist

Respond with ONLY valid JSON, no markdown fences:
{"title": "...", "labels": ["..."], "body": "..."}

Idea: ${idea}
`;

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;

    const child = spawn("claude", ["-p", "--model", "sonnet"], {
      cwd: BACKLOG_DIR,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin.write(prompt);
    child.stdin.end();

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Claude CLI timed out after 90s"));
    }, 90000);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json();

    if (!idea || typeof idea !== "string" || idea.trim().length === 0) {
      return NextResponse.json({ error: "Idea is required" }, { status: 400 });
    }

    // Call Claude CLI to format the idea into an issue
    const prompt = PROMPT_TEMPLATE(idea.trim());
    const claudeOutput = await runClaude(prompt);

    // Parse Claude's JSON response
    const jsonMatch = claudeOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse Claude response" },
        { status: 500 }
      );
    }

    const issue = JSON.parse(jsonMatch[0]) as {
      title: string;
      labels: string[];
      body: string;
    };

    // Validate labels
    const validLabels = ["learning", "infra", "side-project", "content", "core-skill"];
    issue.labels = issue.labels.filter((l) => validLabels.includes(l));
    if (issue.labels.length === 0) {
      issue.labels = ["learning"];
    }

    // Create the GitHub issue
    const labelArgs = issue.labels.map((l) => `--label "${l}"`).join(" ");
    const ghCmd = `gh issue create --repo ${BACKLOG_REPO} --title "${issue.title.replace(/"/g, '\\"')}" --body "${issue.body.replace(/"/g, '\\"')}" ${labelArgs}`;

    const { stdout: ghOutput } = await execAsync(ghCmd, {
      cwd: BACKLOG_DIR,
      timeout: 30000,
    });

    const url = ghOutput.trim();

    return NextResponse.json({
      url,
      title: issue.title,
      labels: issue.labels,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
