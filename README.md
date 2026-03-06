[🇰🇷 한국어](./README.ko.md)

# Backlog Idea

A local web app that turns raw ideas into structured GitHub issues on the [backlog](https://github.com/WoojinAhn/backlog) repo — powered by Claude Code CLI.

## How It Works

```
Browser (idea input) → Next.js API Route → claude -p (stdin) → gh issue create
```

1. Enter an idea in the textarea
2. Claude Code CLI (`claude -p --model sonnet`) formats it into a proper issue (title, labels, body) following the backlog repo's conventions
3. `gh` CLI creates the issue on GitHub
4. The created issue URL is returned

No Anthropic API key needed — uses your existing Claude Code subscription.

### Technical Notes

- The prompt is passed to `claude` via **stdin** (not as a CLI argument) to avoid intermittent hangs.
- Uses `spawn` (not `exec`) for reliable subprocess control.
- `CLAUDECODE` / `CLAUDE_CODE_ENTRYPOINT` env vars are stripped to prevent nested session detection.

> **⚠️ Local-only** — This app runs CLI tools (`claude`, `gh`) as subprocesses and cannot be deployed to cloud platforms (Vercel, etc.) as-is.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude`)
- [GitHub CLI](https://cli.github.com/) (`gh`) — authenticated
- Node.js 18+

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKLOG_REPO` | `WoojinAhn/backlog` | Target GitHub repo (`owner/repo`) |
| `BACKLOG_DIR` | `~/home/backlog` | Local clone path (used as `cwd`) |
| `CLAUDE_BIN` | `claude` | Path to Claude Code CLI binary |
| `CLAUDE_MODEL` | `sonnet` | Claude model to use |
| `ISSUE_LABELS` | `learning,infra,side-project,content,core-skill` | Comma-separated valid labels |
| `DEFAULT_LABEL` | *(first of ISSUE_LABELS)* | Fallback label when none match |
| `API_TOKEN` | *(none)* | Bearer token for API auth (optional) |
| `RATE_LIMIT` | `10` | Max requests per minute |
| `LOCALE` | *(auto from `LANG`)* | Language for errors and issue output (`en` or `ko`). Falls back to OS `LANG` env var. |

See `.env.example` for a template.

## Customization

### Prompt Template

Edit `prompt-template.md` in the project root to customize how ideas are formatted into issues. Use `{{LABELS}}` as a placeholder — it will be replaced with your `ISSUE_LABELS` at runtime.

### Labels

Set `ISSUE_LABELS` to match your repo's labels:

```bash
export ISSUE_LABELS="bug,feature,docs,chore"
```

Missing labels are auto-created on the target repo.

## Getting Started

```bash
npm install
cp .env.example .env.local   # edit with your settings
npm run dev
```

Open http://localhost:3000.

## Project Structure

```
app/
├── layout.tsx
├── page.tsx                    # Idea input UI
└── api/
    └── create-issue/
        └── route.ts            # claude CLI → gh issue create
prompt-template.md              # Customizable prompt template
.env.example                    # Environment variable template
```
