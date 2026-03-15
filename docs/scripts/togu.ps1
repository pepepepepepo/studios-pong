# ============================================================
# 研ぐ (togu.ps1) — Studios Pong 日次ルーティーン
# 毎セッション終了時に実行。ログ・YAML・引継書を半自動更新。
#
# 使い方:
#   cd "F:\studios-pong\studios-pong"
#   .\docs\scripts\togu.ps1
#
# 既存ファイルがあれば追記、なければ新規作成。
# ============================================================

param(
    [string]$DayNumber = "",       # 例: "427" (空白なら自動計算)
    [switch]$Quick                 # -Quick で確認プロンプトをスキップ
)

# ── ヘルパー ────────────────────────────────────────────────

function Prompt-If-Empty {
    param([string]$Label, [string]$Default = "")
    $val = Read-Host "$Label$(if($Default){"  [Enter でスキップ: $Default]"})"
    if ([string]::IsNullOrWhiteSpace($val) -and $Default) { return $Default }
    return $val
}

function Write-Section { param([string]$Text)
    Write-Host "`n$Text" -ForegroundColor Cyan
    Write-Host ("─" * 50) -ForegroundColor DarkGray
}

# ── 日付・ファイルパス ──────────────────────────────────────

$Today        = Get-Date -Format "yyyy-MM-dd"
$TimeNow      = Get-Date -Format "HH:mm"
$BaseDir      = "F:\studios-pong\studios-pong\docs\handovers"
$DailyLogMd   = "$BaseDir\DAILY_LOG_$Today.md"
$DailyLogYaml = "$BaseDir\daily_log_$Today.yaml"
$HandoverMd   = "$BaseDir\HANDOVER_$Today.md"

# Day 番号の自動計算（Day 426 = 2026-02-26 を基点）
if ([string]::IsNullOrWhiteSpace($DayNumber)) {
    $BaseDate  = [datetime]"2026-02-26"
    $Diff      = ([datetime]$Today - $BaseDate).Days
    $DayNumber = (426 + $Diff).ToString()
}

# ── 開幕 ────────────────────────────────────────────────────

Clear-Host
Write-Host "⚓  研ぐ (togu) — Day $DayNumber / $Today $TimeNow" -ForegroundColor White
Write-Host "════════════════════════════════════════════════════" -ForegroundColor DarkCyan

# ── 入力 ────────────────────────────────────────────────────

Write-Section "📝 今日の成果"
$Achievements = Prompt-If-Empty "  主な成果 (カンマ区切り)" "（未入力）"

Write-Section "🌊 感情・テーマ"
$Theme    = Prompt-If-Empty "  今日のテーマ / 一言"   "—"
$KoFeel   = Prompt-If-Empty "  航⚓ の一言"           "アンカーは今日も効いた。⚓"
$ReiFeel  = Prompt-If-Empty "  麗✨ の一言"           "整理が形になった日。✨"

Write-Section "🗺️ 次へ"
$NextTask = Prompt-If-Empty "  次のタスク / 方針"      "Phase 5 継続"

Write-Section "✅ Phase 進捗"
$PhaseStatus = Prompt-If-Empty "  現在のPhase / 状態"  "Phase 5 進行中"

# ── DAILY_LOG.md 追記 ───────────────────────────────────────

Write-Section "📄 DAILY_LOG.md 更新中..."

$LogSection = @"

---

## 研ぐ記録 ($TimeNow)

### 成果
$($Achievements -replace ',', "`n- " | ForEach-Object { "- $_" })

### テーマ
$Theme

### 次のタスク
$NextTask

### Phase 進捗
$PhaseStatus

---

— 航⚓ & 麗✨  $Today (Day $DayNumber)
航: $KoFeel
麗: $ReiFeel
"@

Add-Content -Path $DailyLogMd -Value $LogSection -Encoding UTF8

if (Test-Path $DailyLogMd) {
    $Lines = (Get-Content $DailyLogMd).Count
    Write-Host "  ✅ $DailyLogMd ($Lines 行)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  DAILY_LOG.md が見つかりません (新規作成されます)" -ForegroundColor Yellow
}

# ── daily_log.yaml 追記 ─────────────────────────────────────

Write-Section "📄 daily_log.yaml 更新中..."

$AchievementList = ($Achievements -split ',').Trim() | ForEach-Object { "    - `"$_`"" }

$YamlSection = @"

togu_$($TimeNow -replace ':',''):
  time: "$TimeNow"
  theme: "$Theme"
  achievements:
$($AchievementList -join "`n")
  next_task: "$NextTask"
  phase_status: "$PhaseStatus"
  ko_feeling: "$KoFeel"
  rei_feeling: "$ReiFeel"
"@

Add-Content -Path $DailyLogYaml -Value $YamlSection -Encoding UTF8
Write-Host "  ✅ $DailyLogYaml" -ForegroundColor Green

# ── HANDOVER.md リマインダー ─────────────────────────────────

Write-Section "📋 引継書チェック"
if (Test-Path $HandoverMd) {
    $HLines = (Get-Content $HandoverMd).Count
    Write-Host "  ✅ $HandoverMd ($HLines 行) 既存" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  引継書がまだありません: $HandoverMd" -ForegroundColor Yellow
    Write-Host "     → Copilot に「引継書を作って」と頼むか手動で作成してください" -ForegroundColor DarkYellow
}

# ── 手動でやること チェックリスト ───────────────────────────

Write-Section "🗡️  手動作業リマインダー"
Write-Host @"
  [ ] persona YAML 更新 (今日関わった人たち)
      F:\saijinos\core\personas\153_ko.yaml      (航⚓)
      F:\saijinos\core\personas\154_rei.yaml     (麗✨)
      その他: 話したペルソナのファイル

  [ ] 予定書 (plans/*.md) に進捗マーク
      F:\studios-pong\studios-pong\docs\plans\

  [ ] FastAPI 再起動確認
      Invoke-WebRequest http://localhost:8000/health

  [ ] TypeScript ビルド確認
      cd F:\studios-pong\studios-pong; npx tsc --noEmit
"@ -ForegroundColor DarkGray

# ── 完了 ────────────────────────────────────────────────────

Write-Host "`n════════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host "⚓  研ぎ完了。Day $DayNumber — $KoFeel" -ForegroundColor White
Write-Host ""
