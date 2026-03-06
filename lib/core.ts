import { spawn, execSync } from "child_process";
import path from "path";
import { readFileSync, existsSync } from "fs";

export type Locale = "ko" | "en";

export function detectLocale(): Locale {
  const explicit = process.env.LOCALE;
  if (explicit) return explicit === "ko" ? "ko" : "en";
  const lang = process.env.LANG || "";
  return lang.startsWith("ko") ? "ko" : "en";
}

export type Messages = {
  formatFailed: string;
  claudeNotRunnable: string;
  issueFailed: string;
  ghNotRunnable: string;
};

export const messages: Record<Locale, Messages> = {
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
};

export const BACKLOG_REPO = process.env.BACKLOG_REPO || "WoojinAhn/backlog";
export const BACKLOG_DIR = process.env.BACKLOG_DIR || path.join(process.env.HOME!, "home/backlog");
export const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "sonnet";

export function getValidLabels(): string[] {
  const envLabels = process.env.ISSUE_LABELS;
  if (envLabels) {
    return envLabels.split(",").map((l) => l.trim());
  }
  return ["learning", "infra", "side-project", "content", "core-skill"];
}

export function getDefaultLabel(): string {
  return process.env.DEFAULT_LABEL || getValidLabels()[0];
}

export function loadPromptTemplate(): string {
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

export function buildPrompt(idea: string, locale: Locale): string {
  const template = loadPromptTemplate();
  const labels = getValidLabels().join(", ");
  let prompt = template.replace("{{LABELS}}", labels);

  if (locale === "ko") {
    prompt += `\n\nIMPORTANT: Write the issue in BOTH English and Korean.
- Title: English only
- Body: Write the full content in English first, then add "---" separator, then write the exact same content translated in Korean. Both sections must have identical structure and meaning.`;
  } else {
    prompt += "\n\nIMPORTANT: Write the issue title and body entirely in English.";
  }

  return prompt + `\n\nIdea: ${idea}`;
}

export function checkCli(bin: string, name: string): void {
  try {
    execSync(`which ${bin}`, { stdio: "ignore" });
  } catch {
    throw new Error(
      `${name} CLI not found. Install: https://docs.anthropic.com/en/docs/claude-code`
    );
  }
}

export function checkGhAuth(): void {
  try {
    execSync("gh auth status", { stdio: "ignore" });
  } catch {
    throw new Error(
      "GitHub CLI not authenticated. Run: gh auth login"
    );
  }
}

export function runClaude(prompt: string, msg: Messages): Promise<string> {
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

export function createGhIssue(
  title: string,
  body: string,
  labels: string[],
  msg: Messages
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

export async function ensureLabelsExist(labels: string[]): Promise<void> {
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

export type ParsedIssue = {
  title: string;
  labels: string[];
  body: string;
};

export function parseClaudeOutput(output: string): ParsedIssue | null {
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

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

  if (!title) return null;

  return { title, labels, body };
}
