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
