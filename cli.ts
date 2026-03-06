import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local (same config as the web app)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env.local") });

import {
  detectLocale,
  messages,
  CLAUDE_BIN,
  buildPrompt,
  checkCli,
  checkGhAuth,
  runClaude,
  createGhIssue,
  ensureLabelsExist,
  parseClaudeOutput,
} from "./lib/core";

const LOCALE = detectLocale();
const msg = messages[LOCALE];

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString().trim();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const ideaArgs = args.filter((a) => a !== "--dry-run");
  const idea = ideaArgs.length > 0 ? ideaArgs.join(" ") : await readStdin();

  if (!idea) {
    console.error("Usage: npm run cli -- [--dry-run] \"your idea\"");
    console.error("       echo \"your idea\" | npm run cli");
    process.exit(1);
  }

  checkCli(CLAUDE_BIN, "Claude Code");
  checkCli("gh", "GitHub");
  checkGhAuth();

  console.log("Formatting with Claude...");
  const prompt = buildPrompt(idea, LOCALE);
  const claudeOutput = await runClaude(prompt, msg);

  const parsed = parseClaudeOutput(claudeOutput);
  if (!parsed) {
    console.error("Failed to parse Claude response");
    process.exit(1);
  }

  const { title, labels, body } = parsed;

  console.log(`\nTitle: ${title}`);
  console.log(`Labels: ${labels.join(", ")}`);
  console.log(`\n${body}\n`);

  if (dryRun) {
    console.log("(dry-run: issue not created)");
    return;
  }

  console.log("Creating issue...");
  await ensureLabelsExist(labels);
  const url = await createGhIssue(title, body, labels, msg);
  console.log(`\nCreated: ${url}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
