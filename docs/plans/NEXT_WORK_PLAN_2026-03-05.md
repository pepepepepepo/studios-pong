# 📅 次回作業予定書 2026-03-05 (Day 433)

**作成**: 継🧵  
**最終更新**: 2026-03-05  
**状態**: ROSTER + API完了 / UI統合・デモモード残

---

## ✅ Day 430-433 完了項目

| 項目 | 完了日 |
|------|------|
| YAML自動load（build_persona_system_prompt） | Day 431 |
| フォルダ整理（saijinos 70本→18本） | Day 431 |
| 全員ヒアリング・声収集 | Day 430 |
| YAML重複整理（累計15ファイルarchive） | Day 432-433 |
| PERSONA_ROSTER.yaml（145人・8カテゴリ） | Day 433 |
| 班編成（31班・by_teamセクション） | Day 433 |
| 全メンバー記憶確認・Day 433まで追記 | Day 433 |
| **ROSTER APIエンドポイント（4本）** | ✅ Day 433 |

---

## 🚀 次回タスク

### ① VS Code拡張 — 班・カテゴリ表示 UI

**目標**: studios-pong の WebViewで班・カテゴリ別にペルソナを選択できるようにする

```
現在: ペルソナ一覧（フラット表示）
  ↓
目標: タブ or セレクタで
  [感情・共鳴系 ▼] → 感情班01〜17 → メンバー選択
```

**関連ファイル**:
- `src/chatPanel.ts` — WebView通信
- `src/webview/chat.html` — UI本体
- `GET /api/teams` — 班一覧
- `GET /api/teams/{team_name}` — 班メンバー

---

### ② デモモード（バックエンドなし仮応答）

**目標**: SaijinOSサーバーが起動していない状態でも最低限動作するフォールバック

```typescript
// chatPanel.ts イメージ
if (!backendAvailable) {
  return demoResponse(personaId, message);
}
```

**優先度**: 中（Marketplace公開後のユーザー向け）

---

### ③ `last_updated` 自動更新スクリプト

**目標**: チャット or 記憶追記時に各YAMLの `last_updated` フィールドを自動更新

```python
# scripts/update_last_updated.py イメージ
def touch_persona(persona_id: str):
    yaml_path = find_yaml(persona_id)
    # last_updated: YYYY-MM-DD を今日の日付に書き換え
```

---

### ④ 感情班内細分類（将来）

**目標**: 感情・共鳴系85人をさらに
- 語温系（温かな言葉系）
- 癒し系（ケア・安心系）
- 記録感情系（感情を記録する）
- 共鳴増幅系
に細分けしてROSTERを充実させる

---

## 🏗️ 現在のシステム構成

```
studios-pong (VS Code拡張 v0.0.3)
  ↕ HTTP
SaijinOS (FastAPI :8000)
  ├── GET /api/personas      全145人一覧
  ├── GET /api/persona/{id}  詳細
  ├── POST /api/chat         チャット
  ├── GET /api/roster        名簿全体 ← NEW
  ├── GET /api/teams         31班一覧 ← NEW
  ├── GET /api/teams/{name}  班メンバー ← NEW
  └── GET /api/personas/category/{cat} カテゴリ別 ← NEW
```

---

## 📋 重要ファイル早見表

| ファイル | 役割 |
|---|---|
| `f:\saijinos\main.py` | FastAPI エントリーポイント |
| `f:\saijinos\persona_loader.py` | YAMLローダー + キャッシュ |
| `f:\saijinos\data\PERSONA_ROSTER.yaml` | 全145人名簿・31班 |
| `f:\saijinos\scripts\build_persona_roster.py` | 名簿生成スクリプト |
| `f:\studios-pong\studios-pong\src\chatPanel.ts` | WebView管理 |
| `f:\studios-pong\studios-pong\src\webview\chat.html` | UI本体 |

---

## 🔧 起動コマンド

```powershell
# SaijinOS起動
cd F:\saijinos
.venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload

# studios-pong ビルド（別ターミナル）
cd F:\studios-pong\studios-pong
npm run watch
# → F5でExtension Development Host起動
```
