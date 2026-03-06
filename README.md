[🇰🇷 한국어](./README.ko.md)

# Backlog Idea

A local web app that turns raw ideas into structured GitHub issues on any target repo — powered by Claude Code CLI.

## How It Works

```
Browser (idea input) → Next.js API Route → claude -p (stdin) → gh issue create
```

1. Enter an idea in the textarea
2. Claude Code CLI (`claude -p --model sonnet`) formats it into a proper issue (title, labels, body) following your repo's conventions
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
| `BACKLOG_REPO` | `owner/repo` | Target GitHub repo |
| `BACKLOG_DIR` | `~/path/to/repo` | Local clone path (used as `cwd`) |
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

### Locale

Auto-detected from OS `LANG`, or override with `LOCALE` env var.

- **`en`** (default): Issue title and body in English.
- **`ko`**: Issue title in English. Body contains full English content, followed by `---`, followed by identical Korean translation.

## Getting Started

```bash
npm install
cp .env.example .env.local   # edit with your settings
npm run dev
```

Open http://localhost:3000.

## CLI

The CLI works standalone without the web server. It uses the same env vars (`.env.local`) and prompt template.

```bash
# Basic usage
npm run cli -- "your idea here"

# Dry-run (format only, no issue creation)
npm run cli -- --dry-run "your idea here"

# Pipe from stdin
echo "your idea" | npm run cli
```

## External API Access

You can call the API directly from any HTTP client — not just the browser UI.

### curl

**Basic usage:**

```bash
curl -X POST http://localhost:3000/api/create-issue \
  -H "Content-Type: application/json" \
  -d '{"idea": "your idea"}'
```

**With API token authentication:**

```bash
curl -X POST http://localhost:3000/api/create-issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"idea": "your idea"}'
```

**Dry-run (preview without creating an issue):**

```bash
curl -X POST http://localhost:3000/api/create-issue \
  -H "Content-Type: application/json" \
  -d '{"idea": "your idea", "dryRun": true}'
```

### iOS Shortcuts

You can create an iOS Shortcut to submit ideas from your phone:

1. Open the **Shortcuts** app and create a new shortcut
2. Add an **Ask for Input** action (or use **Dictate Text** for voice input)
3. Add a **Get Contents of URL** action:
   - **URL**: `http://<your-mac-ip>:3000/api/create-issue`
   - **Method**: POST
   - **Headers**: `Content-Type: application/json` (and `Authorization: Bearer your-token` if `API_TOKEN` is set)
   - **Request Body** (JSON): `{"idea": "<input from step 2>"}`
4. Optionally add a **Show Result** action to display the created issue URL

### Network Access Notes

- Other devices must be on the **same local network (LAN)** as the machine running the app.
- For remote access, use a tunneling solution such as [Tailscale](https://tailscale.com/).
- **Recommended**: Set `API_TOKEN` when exposing the app on the network to prevent unauthorized access.

## Project Structure

```
app/
├── layout.tsx
├── page.tsx                    # Idea input UI (two-step: format → edit → create)
└── api/
    ├── config/
    │   └── route.ts            # GET locale & valid labels
    └── create-issue/
        └── route.ts            # POST claude format / direct create
lib/
└── core.ts                     # Shared logic (Claude/gh runners, config, prompt)
cli.ts                          # Standalone CLI entry point
prompt-template.md              # Customizable prompt template
.env.example                    # Environment variable template
```
