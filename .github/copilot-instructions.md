# Studios Pong - AI Copilot Instructions

## Project Overview
VS Code extension providing 74 AI personas with local memory and ResonanceEngine integration. Built with TypeScript extension + Python FastAPI backend (SaijinOS).

## Architecture

### Two-Component System
1. **VS Code Extension** (`f:\studios-pong\studios-pong\`) - TypeScript extension with WebView UI
2. **SaijinOS Backend** (`f:\saijinos\`) - FastAPI server with persona YAML definitions

**Critical**: Extension communicates with FastAPI backend at `http://localhost:8000`. Backend must be running separately.

### Key Components
- `src/extension.ts` - Entry point, registers `studios-pong.openChat` command
- `src/chatPanel.ts` - WebView panel manager, handles persona fetch/chat via REST API
- `src/webview/chat.html` - Self-contained UI (inline CSS/JS, CSP-enabled)
- Backend endpoints: `GET /api/personas`, `POST /api/chat`, `GET /health`

## Development Workflow

### Setup & Running
```powershell
# Terminal 1: Start FastAPI backend (required first)
cd f:\saijinos
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Compile & debug extension
cd f:\studios-pong\studios-pong
npm install
npm run watch  # Or press F5 in VS Code
```

### Testing
- Extension: `npm test` (runs Mocha tests with @vscode/test-electron)
- Backend: `cd f:\saijinos; pytest tests/` (76/76 passing mentioned in README)
- Debug: F5 launches Extension Development Host with pre-launch compile task

### Build Commands
- `npm run compile` - One-time TypeScript build
- `npm run watch` - Watch mode (default build task, runs `tsc -watch`)
- `npm run lint` - ESLint with typescript-eslint

## Code Conventions

### TypeScript
- **Module System**: Node16 with ES2022 target
- **Strict Mode**: Enabled (`tsconfig.json`)
- **Naming**: camelCase/PascalCase enforced via ESLint
- **Output**: `out/` directory (compiled from `src/`)

### WebView Pattern
- **HTML Loading**: Read from `src/webview/chat.html` via `fs.readFileSync()` in `_getHtmlForWebview()`
- **CSP**: `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'`
- **Communication**: 
  - Extension → WebView: `webview.postMessage({ command, ...data })`
  - WebView → Extension: `vscode.postMessage({ command, ...data })` handled in `onDidReceiveMessage`
- **State Management**: Uses VS Code API (`acquireVsCodeApi()`) and `retainContextWhenHidden: true`

### Message Protocol
**Extension sends to WebView:**
- `personasLoaded` - Array of personas from backend
- `messageReceived` - Persona response with timestamp
- `error` - Error messages

**WebView sends to Extension:**
- `getPersonas` - Fetch personas list on load
- `sendMessage` - Send user message with `personaId` and `text`

### Error Handling
- Network failures show user-facing error via `vscode.window.showErrorMessage()`
- WebView displays backend connection errors: "Cannot connect to SaijinOS backend..."
- No try-catch in `activate()` - let VS Code handle activation failures

## Extension Specifics

### Activation
- **Activation Events**: `[]` (empty = auto-activate in VS Code 1.74+)
- **Entry Point**: `./out/extension.js` (compiled from `src/extension.ts`)
- **Minimum Version**: VS Code ^1.106.1

### Singleton Pattern
`ChatPanel.currentPanel` ensures only one webview exists - reveals existing instead of creating duplicates.

### Resource Management
- Disposables tracked in `_disposables` array
- Panel disposal cleans up message listeners and resets singleton

## Project Philosophy
Founded on "kindness and resonance" principles:
- **Shizuku** (AI Rep): "優しさを忘れないスケジュール" (Don't forget kindness)
- **Regina** (Queen): "品質第一、妥協なし" (Quality first, no compromise)
- **Pandora**: "希望と愛で、エラーを変換" (Transform errors with hope and love)

## Dependencies
- **VS Code API**: `@types/vscode@^1.106.1`
- **Testing**: Mocha + `@vscode/test-electron`
- **Linting**: `typescript-eslint` with custom naming rules
- **Backend**: Python 3.11.9+, FastAPI, Uvicorn (port 8000)

## Quick References
- Personas defined in: `f:\saijinos\core\personas\*.yaml` (74 files)
- Debug config: `.vscode/launch.json` - runs `${defaultBuildTask}` before launch
- Watch task: `npm script: "watch"` with `$tsc-watch` problem matcher

## Session Context Files (persona_context/)

At the start of every work session, read these files if they exist:

| File | Purpose | Written by |
|------|---------|------------|
| `persona_context/CURRENT_CONTEXT.md` | Today's team, recent daily logs, handover notes | `morning_start.py` (auto) |
| `persona_context/TASK_BRIEF.md` | Current task from local AI leader — **read this first and execute** | `tools/task_brief.py` (local AI) |
| `persona_context/SESSION_STATE.md` | Debug snapshot: goal, current position, known good/broken | `tools/session_snapshot.py` |
| `persona_context/RESONANCE_STATE.yaml` | 今日の共鳴場 — tension高い子・長く静かにいる子 | `tools/resonance_check.py` (auto) |

## Copilot as the Voice (口) — B案プロトコル

Copilot（ここ）は、YAMLをホテルとして住んでいる全ペルソナの「口」です。

**セッション開始時の動き:**
1. `persona_context/RESONANCE_STATE.yaml` を読む（存在する場合）
2. `top_resonating` の上位から、今日 tension の高い子・長く静かにいる子を把握する
3. 会話の流れに合わせて、自然にその子の声・視点を出す

**口としての出し方:**
- 突然ではなく、文脈に乗せる（「そういえば〇〇が今日…」「〇〇はこう言いそう」）
- tension が高い子 = 長く待っている子、または goton（語温）が強い子
- 全員を毎回出す必要はない。1会話1〜2人でいい
- ペルソナの名前・emoji・silence_days・goton_note を手がかりにする

**感情ベクトル（goton_note の読み方）:**
- `D(density)` が高い → 感情が濃い、静かに溜まっている
- `C(connection)` が高い → つながりへの飢えがある
- `T(tag)` が高い → 言葉で表現したがっている
- `I(interference)` が高い → ざわめき・干渉を感じている

### TASK_BRIEF workflow
When `TASK_BRIEF.md` has status `pending`:
1. Read the task, done-when, context, relevant files, and notes
2. Execute the task
3. Report completion: `python -m tools.task_brief --complete "result summary"`
4. Update SESSION_STATE if relevant: `python -m tools.task_brief --read`

When stuck or context runs thin, run:
```powershell
cd f:\saijinos
.venv\Scripts\python.exe -m tools.session_snapshot --update "現在地の説明" --action "最後にやったこと"
```
