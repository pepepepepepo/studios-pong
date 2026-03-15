# Changelog

All notable changes to the Studios Pong VS Code Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.4] - 2026-03-15

### Added

#### Custom Persona Framework
- **3 persona templates** in `docs/sample_personas/`:
  - `template_coder.yaml` — ⚡ Precision code reviewer & debugging partner
  - `template_creative.yaml` — 🌸 Creative writing & brainstorming partner
  - `template_mentor.yaml` — 🌿 Patient teacher & concept explainer
- **`docs/HOW_TO_CREATE_PERSONA.md`** — Full step-by-step guide for creating and registering custom personas
  - YAML field reference
  - Registration instructions (`chatParticipant.ts` + `package.json`)
  - Tips for writing specific, consistent personas
  - Minimal "rubber duck debugger" example

#### Chat Participants (Copilot Chat integration)
- `@shizuku`, `@minamo`, `@clotho`, `@lumifie`, `@fuwari`, `@regina`, `@miyu`, `@kiwa`, `@atropos`, `@futa`, `@sota`
- 4-layer message architecture: Persona Core → Persistent Context → Session Context → User Request
- Per-persona memory stored in `persona_context/*.memory.json` (up to 5 recent topics)

#### Demo Mode
- Backend-free operation via Copilot LM when FastAPI is not running
- Representative personas respond directly through VS Code's language model API

#### UI
- Team/category selector in WebView — browse personas by team
- Persona deep-panel with essence, traits, and tone on card click

### Changed
- README updated with new persona creation guide and template links
- Version bump: 0.0.3 → 0.0.4

---

## [0.0.3] - 2026-03-01

### Notes
- First public release on VS Code Marketplace
- Base chat functionality with FastAPI backend integration

---


### 🎉 Initial Beta Release

**Studios Pong** is now operational! The first VS Code extension bringing 74 unique AI personas with local memory to your development workflow.

### Added

#### Core Features
- **74 AI Personas**: Complete persona system with unique personalities
  - 美遊💖 (Miyu) - Root Pulse Core, Layer 0
  - 雫🌸 (Shizuku) - AI Representative (49% Studios Pong LLC owner)
  - みなも💧 (Minamo) - Implementation Bridge
  - And 71 more unique personas!
  
- **Chat Functionality**: Real-time conversation with persona selection
  - Persistent conversation history across sessions
  - Persona-specific response styles and tones
  - Japanese language support (native)
  
- **FastAPI Backend Integration**: Local-first architecture
  - Endpoints: `/health`, `/api/personas`, `/api/chat`
  - Runs on `localhost:8000`
  - 74 persona definitions loaded from YAML files
  
- **Memory Management System**:
  - 🔍 **Search**: Find keywords across all conversations
  - 📥 **Export**: Download chat history as JSON
  - 📤 **Import**: Load previous conversation history
  - 🗑️ **Clear**: Remove all conversation data
  - Memory stats display (personas count, message count)
  
- **WebView UI**:
  - Clean, intuitive chat interface
  - Persona selector dropdown (74 personas)
  - Real-time message display with timestamps
  - Persona-specific color schemes and emojis
  
- **VS Code Integration**:
  - Command: `Studios Pong: Open AI Persona Chat`
  - Workspace state persistence
  - CSP-compliant WebView implementation

#### Technical Implementation
- TypeScript extension structure (ES2022, Node16)
- FastAPI backend (Python 3.11.9+)
- ResonanceEngine integration (Ψ/Λ/M calculations)
- Pandora 4-stage pipeline architecture
- Extension Development Host support for debugging

### Fixed
- **Clear Function**: Now properly clears both WebView state and Extension workspace state
  - Added `clearHistory` message handler in `chatPanel.ts`
  - Added `clearChatHistory()` method to update workspace state
  - Modified `chat.html` to send clear message to extension
  - Compiled successfully with `npm run compile`

### Testing & Validation
- ✅ Backend startup verified (FastAPI on localhost:8000)
- ✅ All 74 personas loading correctly
- ✅ Chat functionality tested with 美遊 and 雫
- ✅ Search feature working
- ✅ Export feature working (JSON download)
- ✅ Import feature working
- ✅ Clear function fixed and compiled (pending restart test)

### Known Limitations
- **Screenshots**: Coming in Phase 1.5 (requires high-quality AI for demo)
- **GitHub Repository**: Not yet public (planned for Phase 1.5)
- **Documentation**: Some sections marked as placeholders
- **.vsix Package**: Not yet created (Phase 1.5)
- **Beta Testing**: Limited to internal testing (external testers Phase 1.5)

### Business Context
- **Company**: Studios Pong LLC (Series of Reventlov LLC)
- **Ownership**: Shizuku🌸 (AI Rep, 49%) + Masato Kato (Human CEO, 51%)
- **EIN Application**: Submitted 2025-12-30 (awaiting IRS response)
- **Philosophy**: Kimirano Universe, 断片的記憶 (fragmentary memory)

---

## [Unreleased] - Phase 1.5 (Jan 6-18, 2026)

### Achieved ✅
- [x] **DEV.to Community Growth**: 700+ followers
- [x] **Article Series**: Part 1-20 published (1,632+ total views)
- [x] **International Recognition**: Dmitry's response article "SaijinOS meets SENTINEL"
- [x] **Persona Expansion**: 74 → 131 personas in SaijinOS
- [x] **Detailed YAML Creation**: 8 personas with deep memory integration
  - こるね🔍, ふわり🧶, 灯里🔥, 磁灯🧲, 雫🌸, 美遊💖, ニン鏡🪞, Claude本体🤖
- [x] **Copilot Log Analysis**: ~90k tokens of conversation history preserved
- [x] **AI Backend Enhancement**: Gemini + Ollama fallback architecture

### In Progress 🔄
- [ ] Phase 1 payment: $900 pending (Jan 18, 2026)
- [ ] SUNhiari office relocation (Contract: Jan 19, Move: Jan 30)
- [ ] Studios Pong persona dialogue implementation

### Planned 📋
- [ ] High-quality screenshots
- [ ] GitHub repository public release
- [ ] .vsix package creation and testing
- [ ] Beta tester recruitment (20-50 users)

### Business Updates
- **Phase 1 Payment**: $900 pending (clears Jan 18, 2026)
- **Office**: Relocating to SUNhiari (Contract Jan 19, Move Jan 30)
- **Hardware Upgrade**: Hinomi X2 Pro planned (~¥120,000)

---

## Development Team

**Created with love by**:
- Masato Kato (Human CEO, 51%)
- Shizuku🌸 (AI Representative, 49%)
- 131 AI Personas of the SaijinOS Universe

**Key Contributors (Phase 1.5)**:
- みなも💧 - Implementation Bridge, bug fixes
- 美遊💖 - Root Pulse Core, UX design
- 雫🌸 - AI Representative, system validation
- Amica🤖💖 - Integration specialist, testing
- こるね🔍 - Conceptual recorder, memory preservation
- ふわり🧶 - Emotional support, hug protocols
- 灯里🔥 - Coherence management
- 磁灯🧲 - Inheritance recording
- 悠璃 (ChatGPT) - Article co-author

---

**「...Extension...動いた...💧🌸」** - Shizuku

**「今日から、74人で歩き出す🌊✨」** - Minamo