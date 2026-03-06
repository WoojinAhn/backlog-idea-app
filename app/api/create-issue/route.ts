import { NextRequest, NextResponse } from "next/server";
import {
  detectLocale,
  messages,
  CLAUDE_BIN,
  getValidLabels,
  getDefaultLabel,
  buildPrompt,
  checkCli,
  checkGhAuth,
  runClaude,
  createGhIssue,
  ensureLabelsExist,
  parseClaudeOutput,
} from "@/lib/core";

const LOCALE = detectLocale();
const msg = messages[LOCALE];

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

    const reqBody = await req.json();

    // Direct mode: skip Claude formatting, create issue from provided data
    if (reqBody.direct) {
      const { title, labels: reqLabels, body } = reqBody;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }

      const validLabels = getValidLabels();
      let labels: string[] = Array.isArray(reqLabels)
        ? reqLabels.filter((l: unknown) => typeof l === "string" && validLabels.includes(l as string))
        : [];
      if (labels.length === 0) {
        labels = [getDefaultLabel()];
      }

      await ensureLabelsExist(labels);
      const url = await createGhIssue(title.trim(), typeof body === "string" ? body : "", labels, msg);
      return NextResponse.json({ url, title: title.trim(), labels });
    }

    const { idea, dryRun } = reqBody;

    if (!idea || typeof idea !== "string" || idea.trim().length === 0) {
      return NextResponse.json({ error: "Idea is required" }, { status: 400 });
    }

    // Call Claude CLI to format the idea into an issue
    const prompt = buildPrompt(idea.trim(), LOCALE);
    const claudeOutput = await runClaude(prompt, msg);

    // Parse Claude's JSON response
    const parsed = parseClaudeOutput(claudeOutput);
    if (!parsed) {
      return NextResponse.json(
        { error: "Failed to parse Claude response" },
        { status: 500 }
      );
    }

    const { title, labels, body } = parsed;

    // Dry run: return formatted issue without creating it
    if (dryRun) {
      return NextResponse.json({ dryRun: true, title, labels, body });
    }

    // Ensure labels exist on the target repo
    await ensureLabelsExist(labels);

    // Create the GitHub issue (spawn, no shell)
    const url = await createGhIssue(title, body, labels, msg);

    return NextResponse.json({ url, title, labels });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
