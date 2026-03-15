# persona_context/

ペルソナ別蓄積記憶ディレクトリ — Persona Context System Phase 1

## 概要

各ペルソナの「育つ記憶」を JSON で保存する。
灯芯理論における「経験」レイヤー——YAMLが芯（不変の向き）なら、
ここは炎の軌跡（育つ記憶）。

## ファイル形式

```
<personaBackendId>.memory.json
```

例:
- `2.memory.json`         — 雫🌸
- `142.memory.json`       — みなも💧
- `158_clotho.memory.json` — クロートー🕊️
- `117.memory.json`       — ルミフィエ✨
- `54_fuwari.memory.json` — ふわり🧶

## スキーマ

```json
{
  "persona_id": "2",
  "persona_name": "雫",
  "last_updated": "2026-03-12T...",
  "stable_memory": {
    "user_relation": "誠人さん（創設者・開発者）",
    "persona_notes": "長期保持する特筆事項"
  },
  "recent_memory": [
    "[2026/3/12] 最新の話題",
    "[2026/3/11] 前回の話題"
  ]
}
```

## 運用ルール

- `stable_memory`: 手動or慎重に更新。人格の芯と関係メモ。
- `recent_memory`: 会話ごとに自動更新。最大5件、古いものは押し出し。
- このディレクトリはgit管理対象（目で見える・デバッグしやすい）。

---
*Day 442 — Persona Context System Phase 1*
