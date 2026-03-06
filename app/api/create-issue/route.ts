import { NextRequest, NextResponse } from "next/server";
import { spawn, execSync } from "child_process";
import path from "path";
import { readFileSync, existsSync } from "fs";

function detectLocale(): "ko" | "en" {
  const explicit = process.env.LOCALE;
  if (explicit) return explicit === "ko" ? "ko" : "en";
  const lang = process.env.LANG || "";
  return lang.startsWith("ko") ? "ko" : "en";
}

const LOCALE = detectLocale();

const messages = {
  en: {
    formatFailed: "Failed to format issue",
    claudeNotRunnable: "Cannot run Claude CLI",
    issueFailed: "Failed to create issue",
    ghNotRunnable: "Cannot run GitHub CLI",
  },
  ko: {
    formatFailed: "이슈 포맷팅에 실패했습니다",
    claudeNotRunnable: "Claude CLI를 실행할 수 없습니다",
    issueFailed: "이슈 생성에 실패했습니다",
    ghNotRunnable: "GitHub CLI를 실행할 수 없습니다",
  },
} as const;

const msg = messages[LOCALE];

const BACKLOG_REPO = process.env.BACKLOG_REPO || "WoojinAhn/backlog";
const BACKLOG_DIR = process.env.BACKLOG_DIR || path.join(process.env.HOME!, "home/backlog");
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "sonnet";

// Load prompt template from file, or use default
function loadPromptTemplate(): string {
  const customPath = path.join(process.cwd(), "prompt-template.md");
  if (existsSync(customPath)) {
    return readFileSync(customPath, "utf-8");
  }
  return `You are a backlog issue formatter. Given a raw idea, generate a structured GitHub issue.

Rules:
- Title: Use noun or gerund form (e.g. "Auth System", "API Migration", "Redis Caching Setup")
- Title can use parentheses for context: "Reference Repo Setup (E-commerce Domain)"
- Title can use → for transitions: "Vercel → AWS Deployment Migration"
- Labels: pick 1+ from: {{LABELS}}
- Body format:
  ## Goal
  (clear goal)

  ## Background
  (optional context, omit section if not needed)

  ## Tasks
  - [ ] action items as checklist

Respond with ONLY valid JSON, no markdown fences:
{"title": "...", "labels": ["..."], "body": "..."}`;
}

function getValidLabels(): string[] {
  const envLabels = process.env.ISSUE_LABELS;
  if (envLabels) {
    return envLabels.split(",").map((l) => l.trim());
  }
  return ["learning", "infra", "side-project", "content", "core-skill"];
}

function getDefaultLabel(): string {
  return process.env.DEFAULT_LABEL || getValidLabels()[0];
}

function buildPrompt(idea: string): string {
  const template = loadPromptTemplate();
  const labels = getValidLabels().join(", ");
  let prompt = template.replace("{{LABELS}}", labels);

  if (LOCALE === "ko") {
    prompt += "\n\nIMPORTANT: Write the issue title and body entirely in Korean.";
  } else {
    prompt += "\n\nIMPORTANT: Write the issue title and body entirely in English.";
  }

  return prompt + `\n\nIdea: ${idea}`;
}

// Check CLI tool availability
function checkCli(bin: string, name: string): void {
  try {
    execSync(`which ${bin}`, { stdio: "ignore" });
  } catch {
    throw new Error(
      `${name} CLI not found. Install: https://docs.anthropic.com/en/docs/claude-code`
    );
  }
}

function checkGhAuth(): void {
  try {
    execSync("gh auth status", { stdio: "ignore" });
  } catch {
    throw new Error(
      "GitHub CLI not authenticated. Run: gh auth login"
    );
  }
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;

    const child = spawn(CLAUDE_BIN, ["-p", "--model", CLAUDE_MODEL], {
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
      reject(new Error("Claude CLI timed out"));
    }, 90000);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.error(`Claude CLI error (code ${code}): ${stderr}`);
        reject(new Error(msg.formatFailed));
      } else {
        resolve(stdout);
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      console.error("Claude CLI spawn error:", err);
      reject(new Error(msg.claudeNotRunnable));
    });
  });
}

function createGhIssue(
  title: string,
  body: string,
  labels: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "issue", "create",
      "--repo", BACKLOG_REPO,
      "--title", title,
      "--body", body,
    ];
    for (const label of labels) {
      args.push("--label", label);
    }

    const child = spawn("gh", args, {
      cwd: BACKLOG_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("GitHub CLI timed out"));
    }, 30000);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.error(`gh CLI error (code ${code}): ${stderr}`);
        reject(new Error(msg.issueFailed));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      console.error("gh CLI spawn error:", err);
      reject(new Error(msg.ghNotRunnable));
    });
  });
}

async function ensureLabelsExist(labels: string[]): Promise<void> {
  for (const label of labels) {
    try {
      execSync(
        `gh label create "${label}" --repo ${BACKLOG_REPO} --force`,
        { stdio: "ignore" }
      );
    } catch {
      // label creation failed, issue create will handle it
    }
  }
}

const API_TOKEN = process.env.API_TOKEN;

const requestTimestamps: number[] = [];
const RATE_LIMIT = Number(process.env.RATE_LIMIT) || 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(): boolean {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT) return false;
  requestTimestamps.push(now);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check (optional, enabled when API_TOKEN is set)
    if (API_TOKEN) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${API_TOKEN}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Rate limiting
    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    // Validate CLI tools on first request
    checkCli(CLAUDE_BIN, "Claude Code");
    checkCli("gh", "GitHub");
    checkGhAuth();

    const { idea, dryRun } = await req.json();

    if (!idea || typeof idea !== "string" || idea.trim().length === 0) {
      return NextResponse.json({ error: "Idea is required" }, { status: 400 });
    }

    // Call Claude CLI to format the idea into an issue
    const prompt = buildPrompt(idea.trim());
    const claudeOutput = await runClaude(prompt);

    // Parse Claude's JSON response
    const jsonMatch = claudeOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse Claude response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validLabels = getValidLabels();

    const title = typeof parsed.title === "string" ? parsed.title : "";
    const body = typeof parsed.body === "string" ? parsed.body : "";
    let labels: string[] = Array.isArray(parsed.labels)
      ? parsed.labels.filter((l: unknown) => typeof l === "string" && validLabels.includes(l as string))
      : [];

    if (labels.length === 0) {
      labels = [getDefaultLabel()];
    }

    if (!title) {
      return NextResponse.json(
        { error: "Claude returned empty title" },
        { status: 500 }
      );
    }

    // Dry run: return formatted issue without creating it
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        title,
        labels,
        body,
      });
    }

    // Ensure labels exist on the target repo
    await ensureLabelsExist(labels);

    // Create the GitHub issue (spawn, no shell)
    const url = await createGhIssue(title, body, labels);

    return NextResponse.json({ url, title, labels });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
