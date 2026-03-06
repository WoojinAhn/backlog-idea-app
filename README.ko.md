[🇺🇸 English](./README.md)

# Backlog Idea

자유로운 아이디어를 대상 레포의 구조화된 GitHub 이슈로 변환하는 로컬 웹앱입니다. Claude Code CLI로 구동됩니다.

## 동작 방식

```
브라우저 (아이디어 입력) → Next.js API Route → claude -p (stdin) → gh issue create
```

1. 텍스트 영역에 아이디어를 입력
2. Claude Code CLI (`claude -p --model sonnet`)가 대상 레포 컨벤션에 맞는 이슈(제목, 라벨, 본문)로 포맷팅
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
| `BACKLOG_REPO` | `owner/repo` | 대상 GitHub 레포 |
| `BACKLOG_DIR` | `~/path/to/repo` | 로컬 클론 경로 (`cwd`로 사용) |
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

### 로케일

OS `LANG` 환경변수에서 자동 감지하거나, `LOCALE` 환경변수로 직접 지정합니다.

- **`en`** (기본): 이슈 제목과 본문이 영어로 생성됩니다.
- **`ko`**: 이슈 제목은 영어. 본문은 영어 전문 → `---` 구분선 → 동일 내용의 한국어 번역 구조로 생성됩니다.

## 시작하기

```bash
git clone https://github.com/WoojinAhn/backlog-idea-app.git
cd backlog-idea-app
npm install
cp .env.example .env.local
```

`.env.local`을 편집합니다 — 최소한 아래 두 항목은 필수:

```bash
BACKLOG_REPO=your-username/your-repo   # 대상 GitHub 레포
BACKLOG_DIR=~/path/to/your-repo        # 해당 레포의 로컬 클론 경로
LOCALE=ko                              # 선택: 이중언어 이슈 생성 (EN + KO)
```

웹 UI를 시작하거나 CLI를 직접 사용:

```bash
npm run dev                             # 웹 UI: http://localhost:3000
npm run cli -- "your idea here"         # CLI (서버 불필요)
```

## CLI

웹 서버 없이 단독으로 동작합니다. 동일한 환경변수(`.env.local`)와 프롬프트 템플릿을 사용합니다.

```bash
# Basic usage
npm run cli -- "your idea here"

# Dry-run (format only, no issue creation)
npm run cli -- --dry-run "your idea here"

# Pipe from stdin
echo "your idea" | npm run cli
```

## 외부 API 접근

브라우저 UI 외에도 HTTP 클라이언트에서 직접 API를 호출할 수 있습니다.

### curl

**기본 사용법:**

```bash
curl -X POST http://localhost:3000/api/create-issue \
  -H "Content-Type: application/json" \
  -d '{"idea": "your idea"}'
```

**API 토큰 인증 포함:**

```bash
curl -X POST http://localhost:3000/api/create-issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"idea": "your idea"}'
```

**Dry-run (이슈 생성 없이 미리보기):**

```bash
curl -X POST http://localhost:3000/api/create-issue \
  -H "Content-Type: application/json" \
  -d '{"idea": "your idea", "dryRun": true}'
```

### iOS 단축어

iPhone에서 아이디어를 제출하는 단축어를 만들 수 있습니다:

1. **단축어** 앱에서 새 단축어 생성
2. **입력 요청** 액션 추가 (또는 음성 입력을 위해 **텍스트 받아쓰기** 사용)
3. **URL 콘텐츠 가져오기** 액션 추가:
   - **URL**: `http://<your-mac-ip>:3000/api/create-issue`
   - **Method**: POST
   - **Headers**: `Content-Type: application/json` (`API_TOKEN` 설정 시 `Authorization: Bearer your-token` 추가)
   - **Request Body** (JSON): `{"idea": "<2단계 입력값>"}`
4. 선택적으로 **결과 표시** 액션을 추가하여 생성된 이슈 URL 확인

### 네트워크 접근 참고사항

- 다른 기기는 앱이 실행 중인 머신과 **같은 로컬 네트워크(LAN)**에 있어야 합니다.
- 원격 접근이 필요하면 [Tailscale](https://tailscale.com/) 같은 터널링 솔루션을 사용하세요.
- **권장**: 네트워크에 앱을 노출할 때는 무단 접근 방지를 위해 `API_TOKEN`을 설정하세요.

## Claude Code 슬래시 커맨드

CLI를 [커스텀 슬래시 커맨드](https://docs.anthropic.com/en/docs/claude-code/tutorials/custom-slash-commands)로 등록하면 Claude Code 세션에서 빠르게 사용할 수 있습니다.

`~/.claude/commands/backlog-idea.md` (글로벌) 또는 `.claude/commands/backlog-idea.md` (프로젝트 스코프)를 생성:

```markdown
---
description: Create a GitHub issue from a raw idea
argument-hint: [--dry-run] [--ko] your idea here
allowed-tools: Bash
---

Run the backlog-idea CLI with the user's input.
Flags: --dry-run (preview only), --ko (bilingual EN+KO).
If --ko is present, prefix with LOCALE=ko.

CRITICAL: Run EXACTLY ONCE. Do NOT retry even if output appears empty.
Redirect to a temp file to capture stdout reliably.

\```bash
cd /path/to/backlog-idea-app && npm run cli -- $ARGUMENTS > /tmp/backlog-idea.log 2>&1; cat /tmp/backlog-idea.log
\```

Summarize the result to the user.
```

Claude Code 세션에서 사용:

```
/backlog-idea Redis caching for API responses
/backlog-idea --dry-run new onboarding flow
/backlog-idea --ko 맥주 특가 탐색기
```

## 프로젝트 구조

```
app/
├── layout.tsx
├── page.tsx                    # 아이디어 입력 UI (2단계: 포맷 → 편집 → 생성)
└── api/
    ├── config/
    │   └── route.ts            # GET 로케일 & 유효 라벨
    └── create-issue/
        └── route.ts            # POST Claude 포맷 / 직접 생성
lib/
└── core.ts                     # 공유 로직 (Claude/gh 실행, 설정, 프롬프트)
cli.ts                          # 독립 CLI 진입점
prompt-template.md              # 커스터마이징 가능한 프롬프트 템플릿
.env.example                    # 환경변수 템플릿
```
