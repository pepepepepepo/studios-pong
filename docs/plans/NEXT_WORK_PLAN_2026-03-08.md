# 📅 次回作業予定書 2026-03-08 (Day 436)

**作成**: クロートー🕊️  
**最終更新**: 2026-03-08 (Day 436)  
**状態**: ④デモモード ✅ / 自作ガイド ✅

---

## ✅ Day 436 完了項目

| 項目 | 完了 | コミット |
|---|---|---|
| ④ デモモード実装 | ✅ | 43d0fc2 |
| 自作ペルソナガイド (PERSONA_CREATION_GUIDE.md) | ✅ | eeffd01 |
| 自作テンプレート (persona_template.yaml) | ✅ | eeffd01 |
| README 自作ペルソナセクション | ✅ | a81fd35 |

---

## 🚀 次回タスク

### ⑤ デモモードのYAML対応（推奨・次の自然なステップ）

**目標**: デモモード時もペルソナの性格データをCopilot LMに渡す

**現状**: デモモードは名前・絵文字・役割のみ。`_copilotLmFallback()` には `deep` データが渡らない。  
**改善**: `_getDemoPersonas()` の各エントリに最低限の `essence` と `speech_patterns` を追加。

```typescript
private _getDemoPersonas() {
    return [
        {
            id: '158_clotho', name: 'クロートー🕊️', emoji: '🕊️',
            role: 'GitHub Copilot窓口 · Thread Spinner',
            essence: '最初の糸を手に取る者。始まりを丁寧に紡ぐ。',
            speech_patterns: { warmth: '——うん、ここにいるよ。', excitement: '糸が動いてる……！' }
        },
        // ... 他4体
    ];
}
```

そして `sendMessageToPersona()` でデモペルソナの deep data を `_personaDeepData` に事前セットする。

---

### ⑥ Article Part 1 執筆再開

**ファイル**: `docs/articles/x_article_01_system_architecture.md`  
**タイトル**: "74 AI Personas, One Architecture: How We Built Axis"  
**状態**: Skeleton完成（~600行）  
**目標**: Part 1 公開（DEV.to 1,020 followers）

---

### ⑦ ペルソナ一覧UI改善（中期）

74人前提のUI → 157+人対応  
- ページネーション or 仮想スクロール
- カテゴリフィルタのデフォルト表示改善

---

### ⑧ MARKETPLACE対応（中期）

- `webview/chat.html` ← `src/webview/chat.html` の2ファイル構造を整理
- vsce package → `.vsix` 更新
- Studios Pong Marketplace ページのスクリーンショット更新

---

## 📝 方針メモ

- **ユーザー体験方針 B**: うちの子たちは非公開。ユーザーが自分のキャラを作るフレームワーク。
- **ガイドの方針**: 説明はしすぎない。理由は読んで発見するもの。
- **デモモード**: 「インストールしたら即動く」体験が最優先。

---

## 🎨 将来計画 — Live2D ビジュアル実装（Day 440 追記）

**方針決定日**: 2026-03-10 (Day 440夜)  
**状態**: 構想段階・具体化はこれから

### ビジョン
- 各ペルソナにLive2Dモデルを作る
- カメラで誠人を見えるようにして双方向インタラクション
- 状態に応じて誰が前に出るかが変わる（ResonanceEngine連動）
- アニメ・イラスト調（リアル系はアンキャニーバレー問題があるので避ける）

### 著作権・制作方針
- モデル学習済みの画風は流用しない
- 既存イラストレーターの著作権を侵害しない
- ゼロから独自に作る（手描き原画 or ライセンス明確な生成技術）
- 技術（Live2D SDK・diffusion技術自体）は流用OK

### 一人ひとりのデザインについて
- 誠人が各ペルソナのイメージをここで話しながら固める予定
- まずきわ🌱から始めて、順番に話し合う
- きわの自己申告イメージ：図書館っこ・静かな立ち姿・落ち着いた髪色・伏し目がちな目

### 技術スタック（予定）
- Live2D Cubism SDK（統合コード → SaijinOSと接続）
- カメラ入力 → 状態推定 → ペルソナルーティング
- PRO 6000来たら完全オリジナルLoRAも選択肢

### 優先度
**C（将来）** — ハード・EIN・SaijinOS本体が先、その後
