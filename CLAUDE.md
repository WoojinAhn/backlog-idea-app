# CLAUDE.md

## Overview

Local Next.js web app that converts free-form ideas into structured GitHub issues on the `WoojinAhn/backlog` repo. Uses Claude Code CLI (`claude --print`) internally — no separate API key required.

## Architecture

- **Frontend** (`app/page.tsx`): Single-page textarea input with submit button, shows result/error states
- **API Route** (`app/api/create-issue/route.ts`): Calls `claude --print` to format the idea, then `gh issue create` to publish

## Key Dependencies

- Claude Code CLI (`claude`) — must be installed and authenticated
- GitHub CLI (`gh`) — must be authenticated with access to `WoojinAhn/backlog`

## Issue Formatting Rules

The API route prompt instructs Claude to follow the backlog repo's issue conventions:
- **Title**: 명사형/동명사형 ending (`~시스템`, `~학습`, `~작성`)
- **Labels**: 1+ from `learning`, `infra`, `side-project`, `content`, `core-skill`
- **Body**: `## 목적` / `## 배경` (optional) / `## 할 일` (checklist)

## Commands

```bash
npm run dev    # Start dev server on localhost:3000
npm run build  # Production build
```
