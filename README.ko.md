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

## 설정

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `BACKLOG_REPO` | `WoojinAhn/backlog` | 대상 GitHub 레포 (`owner/repo`) |
| `BACKLOG_DIR` | `~/home/backlog` | 로컬 클론 경로 (`cwd`로 사용) |
| `CLAUDE_BIN` | `claude` | Claude Code CLI 바이너리 경로 |
| `CLAUDE_MODEL` | `sonnet` | 사용할 Claude 모델 |
| `ISSUE_LABELS` | `learning,infra,side-project,content,core-skill` | 쉼표 구분 유효 라벨 목록 |
| `DEFAULT_LABEL` | *(ISSUE_LABELS의 첫 번째)* | 매칭 라벨 없을 때 기본값 |
| `API_TOKEN` | *(없음)* | API 인증용 Bearer 토큰 (선택) |
| `RATE_LIMIT` | `10` | 분당 최대 요청 수 |
| `LOCALE` | *(`LANG`에서 자동 감지)* | 에러 및 이슈 출력 언어 (`en` 또는 `ko`). OS `LANG` 환경변수를 fallback으로 사용. |

`.env.example` 파일을 참고하세요.

## 커스터마이징

### 프롬프트 템플릿

프로젝트 루트의 `prompt-template.md`를 수정하면 아이디어 → 이슈 변환 방식을 커스터마이징할 수 있습니다. `{{LABELS}}`는 `ISSUE_LABELS` 값으로 런타임에 치환됩니다.

### 라벨

`ISSUE_LABELS`를 자신의 레포 라벨에 맞게 설정하세요:

```bash
export ISSUE_LABELS="bug,feature,docs,chore"
```

대상 레포에 없는 라벨은 자동 생성됩니다.

## 시작하기

```bash
npm install
cp .env.example .env.local   # 설정 편집
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
prompt-template.md              # 커스터마이징 가능한 프롬프트 템플릿
.env.example                    # 환경변수 템플릿
```
