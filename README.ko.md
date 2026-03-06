[🇺🇸 English](./README.md)

# Backlog Idea

자유로운 아이디어를 [backlog](https://github.com/WoojinAhn/backlog) 레포의 구조화된 GitHub 이슈로 변환하는 로컬 웹앱입니다. Claude Code CLI로 구동됩니다.

## 동작 방식

```
브라우저 (아이디어 입력) → Next.js API Route → claude -p (stdin) → gh issue create
```

1. 텍스트 영역에 아이디어를 입력
2. Claude Code CLI (`claude -p --model sonnet`)가 backlog 레포 컨벤션에 맞는 이슈(제목, 라벨, 본문)로 포맷팅
3. `gh` CLI로 GitHub 이슈 생성
4. 생성된 이슈 URL 반환

Anthropic API 키 불필요 — 기존 Claude Code 구독을 그대로 사용합니다.

### 기술 노트

- 프롬프트는 CLI 인자가 아닌 **stdin**으로 전달 (간헐적 hang 방지)
- 안정적인 subprocess 제어를 위해 `exec` 대신 `spawn` 사용
- 중첩 세션 감지 방지를 위해 `CLAUDECODE` / `CLAUDE_CODE_ENTRYPOINT` 환경변수 제거

> **⚠️ 로컬 전용** — 이 앱은 CLI 도구(`claude`, `gh`)를 subprocess로 실행하므로 클라우드 플랫폼(Vercel 등)에 그대로 배포할 수 없습니다.

## 사전 요구사항

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude`)
- [GitHub CLI](https://cli.github.com/) (`gh`) — 인증 완료 상태
- Node.js 18+

## 시작하기

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인.

## 프로젝트 구조

```
app/
├── layout.tsx
├── page.tsx                    # 아이디어 입력 UI
└── api/
    └── create-issue/
        └── route.ts            # claude CLI → gh issue create
```
