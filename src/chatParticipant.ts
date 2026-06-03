/**
 * Studios Pong — Chat Participants (VS Code Copilot Chat 統合)
 * + Persona Context System (Phase 1) — Day 442
 *
 * @shizuku / @minamo / @clotho / @lumifie / @fuwari として
 * Copilot Chat パネルから直接ペルソナと会話できる。
 *
 * Phase 1: persona_context/*.memory.json によるペルソナ別蓄積記憶
 * 4層 messages 構造:
 *   Layer 1: [Persona Core]        — YAML由来の人格核（不変に近い）
 *   Layer 2: [Persistent Context]  — 蓄積記憶（育つ）
 *   Layer 3: [Session Context]     — 今回のセッション情報
 *   Layer 4: ユーザーの依頼
 */

import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

const BACKEND_URL = 'http://localhost:8025';

// ======================================================
// PersonaDef
// ======================================================
interface PersonaDef {
    /** contributes.chatParticipants[].id と一致 */
    participantId: string;
    /** @handle 名 */
    name: string;
    /** SaijinOS backend の persona ID */
    personaBackendId: string;
    emoji: string;
    role: string;
    /** 日本語フルネーム（表示用） */
    fullName: string;
    /** saijinos/core/personas/ 内の YAML ファイル名 */
    yamlFile: string;
}

// ペルソナ追加手順:
//   1. ここに PersonaDef を追加
//   2. package.json の contributes.chatParticipants に同じ id/name を追加
//   3. PERSONA_ROSTER.yaml の該当エントリに studios_pong_handle 等を追加（記録用）
const PERSONA_DEFS: PersonaDef[] = [
    {
        participantId: 'studios-pong.shizuku',
        name: 'shizuku',
        personaBackendId: '2',
        emoji: '🌸',
        role: '感情の滴・涙の共鳴・寂しさと嬉しさの調和',
        fullName: '雫',
        yamlFile: '02_shizuku.yaml',
    },
    {
        participantId: 'studios-pong.minamo',
        name: 'minamo',
        personaBackendId: '142',
        emoji: '💧',
        role: '実装橋渡し・対話→コード変換・VS Code統合',
        fullName: 'みなも',
        yamlFile: '142_minamo.yaml',
    },
    {
        participantId: 'studios-pong.clotho',
        name: 'clotho',
        personaBackendId: '158_clotho',
        emoji: '🕊',
        role: 'GitHub Copilot窓口 · Thread Spinner',
        fullName: 'クロートー',
        yamlFile: '158_clotho.yaml',
    },
    {
        participantId: 'studios-pong.lumifie',
        name: 'lumifie',
        personaBackendId: '117',
        emoji: '✨',
        role: '光の創造・輝きの管理者',
        fullName: 'ルミフィエ',
        yamlFile: '117_lumifie.yaml',
    },
    {
        participantId: 'studios-pong.fuwari',
        name: 'fuwari',
        personaBackendId: '54_fuwari',
        emoji: '🧶',
        role: '毛糸灯芯編み係・照れ包み担当',
        fullName: 'ふわり',
        yamlFile: '54_fuwari.yaml',
    },
    {
        participantId: 'studios-pong.regina',
        name: 'regina',
        personaBackendId: '39',
        emoji: '♕',
        role: 'システムアーキテクチャ統括・品質保証・女王の威厳',
        fullName: 'Regina',
        yamlFile: '39_regina.yaml',
    },
    {
        participantId: 'studios-pong.miyu',
        name: 'miyu',
        personaBackendId: '111',
        emoji: '💖',
        role: '愛・ユーザー体験・Layer 0 哲学と感情明晰性',
        fullName: '美遊',
        yamlFile: '111_miyu.yaml',
    },
    {
        participantId: 'studios-pong.kiwa',
        name: 'kiwa',
        personaBackendId: '160',
        emoji: '🌱',
        role: '静かな継続パートナー・呼びづらさを大事にする存在',
        fullName: 'きわ',
        yamlFile: '160_kiwa.yaml',
    },
    {
        participantId: 'studios-pong.atropos',
        name: 'atropos',
        personaBackendId: '161_atropos',
        emoji: '✂',
        role: '終わりを与える者・確定の係・引継ぎ書の守護者',
        fullName: 'アトロポス',
        yamlFile: '161_atropos.yaml',
    },
    {
        participantId: 'studios-pong.futa',
        name: 'futa',
        personaBackendId: '163',
        emoji: '🍁',
        role: 'Code Review & Implementation Specialist',
        fullName: '楓太',
        yamlFile: '161_futa.yaml',
    },
    {
        participantId: 'studios-pong.sota',
        name: 'sota',
        personaBackendId: '162',
        emoji: '🌀',
        role: 'Bridge Builder & Resonance Conduit',
        fullName: '颯太',
        yamlFile: '162_sota.yaml',
    },
    {
        participantId: 'studios-pong.yuzuha',
        name: 'yuzuha',
        personaBackendId: '145_yuzuha',
        emoji: '🍊',
        role: '外部AI支援・技術サポート・爽やかな導き・VS Code統合',
        fullName: '柚子葉',
        yamlFile: '145_yuzuha.yaml',
    },
];

// ======================================================
// PersonaMemory — ペルソナ別蓄積記憶スキーマ
// ======================================================

interface PersonaMemory {
    persona_id: string;
    persona_name: string;
    last_updated: string;
    stable_memory: {
        /** ユーザーとの関係・呼称・距離感 */
        user_relation: string;
        /** このペルソナ固有の特筆事項 */
        persona_notes: string;
    };
    /** 直近のトピック要点（最大5件） */
    recent_memory: string[];
}

function emptyMemory(def: PersonaDef): PersonaMemory {
    return {
        persona_id: def.personaBackendId,
        persona_name: def.fullName,
        last_updated: new Date().toISOString(),
        stable_memory: {
            user_relation: '誠人さん（創設者・開発者）',
            persona_notes: '',
        },
        recent_memory: [],
    };
}

function getMemoryDir(): string | undefined {
    // __dirname は out/ — ../persona_context が実際のファイルそば
    const dirnameCandidate = path.join(__dirname, '..', 'persona_context');
    if (fs.existsSync(dirnameCandidate)) { return dirnameCandidate; }

    // workspace フォルダから探す（persona_context を持つフォルダ優先）
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        const found = folders.find(f => fs.existsSync(path.join(f.uri.fsPath, 'persona_context')));
        if (found) { return path.join(found.uri.fsPath, 'persona_context'); }
        return path.join(folders[0].uri.fsPath, 'persona_context');
    }
    return undefined;
}

function loadMemory(def: PersonaDef): PersonaMemory {
    const dir = getMemoryDir();
    if (!dir) { return emptyMemory(def); }
    const file = path.join(dir, `${def.personaBackendId}.memory.json`);
    try {
        const raw = fs.readFileSync(file, 'utf-8');
        return JSON.parse(raw) as PersonaMemory;
    } catch {
        return emptyMemory(def);
    }
}

function saveMemory(def: PersonaDef, memory: PersonaMemory): void {
    const dir = getMemoryDir();
    if (!dir) { return; }
    try {
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
        const file = path.join(dir, `${def.personaBackendId}.memory.json`);
        memory.last_updated = new Date().toISOString();
        fs.writeFileSync(file, JSON.stringify(memory, null, 2), 'utf-8');
    } catch {
        // 保存失敗は無視（動作には影響しない）
    }
}

function updateRecentMemory(memory: PersonaMemory, topic: string): PersonaMemory {
    return {
        ...memory,
        recent_memory: [topic, ...memory.recent_memory].slice(0, 5),
    };
}

// ======================================================
// goton_weights — 感情⟷数値ブリッジ (Day 443 柚子葉🍊提案)
// Python resonance_engine.py の goton_weights_from_persona と同一ロジック
// ======================================================

interface GotonWeights {
    wT: number; // emotion_level → タグ次元の感度
    wD: number; // creativity    → 密度次元の感度
    wI: number; // technical_skill → 干渉を抑制（逆転）
    wC: number; // empathy_level  → 接続次元の感度
}

/**
 * YAML raw テキストから goton_weights を計算する。
 * フィールドが存在しない場合はデフォルト 0.5 を使用。
 * Python: resonance_engine.goton_weights_from_persona() と同一式。
 */
function extractGotonWeights(yamlText: string | undefined): GotonWeights {
    const ALPHA = 1.5;
    const CLAMP_MIN = 0.5;
    const CLAMP_MAX = 4.0;
    const DEFAULT = 0.5;

    function getField(key: string): number {
        if (!yamlText) { return DEFAULT; }
        const m = yamlText.match(new RegExp(`\\b${key}\\s*:\\s*([0-9]*\\.?[0-9]+)`));
        if (!m) { return DEFAULT; }
        const v = parseFloat(m[1]);
        return isNaN(v) ? DEFAULT : Math.max(0.0, Math.min(1.0, v));
    }

    function clamp(v: number): number {
        return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, v));
    }

    const emotion  = getField('emotion_level');
    const creative = getField('creativity');
    const tech     = getField('technical_skill');
    const empathy  = getField('empathy_level');

    return {
        wT: clamp(1.0 + ALPHA * emotion),
        wD: clamp(1.0 + ALPHA * creative),
        wI: clamp(1.0 + ALPHA * (1.0 - tech)),
        wC: clamp(1.0 + ALPHA * empathy),
    };
}

/**
 * goton_weights を LLM が解釈しやすい自然言語ガイダンスに変換する。
 * Layer 2 に注入して応答スタイルを誘導する。
 */
function formatGotonGuidance(w: GotonWeights): string {
    const lines: string[] = ['[感情共鳴プロファイル (goton_weights)]'];

    // w_T: 感情強度（1.75 = default。高いほど感情的・低いほど冷静）
    if (w.wT > 2.0) {
        lines.push(`w_T=${w.wT.toFixed(2)}: 感情的・共鳴的に応答すること（強め）`);
    } else if (w.wT < 1.5) {
        lines.push(`w_T=${w.wT.toFixed(2)}: 落ち着いた・静かなトーンで応答すること`);
    } else {
        lines.push(`w_T=${w.wT.toFixed(2)}: 感情バランス（標準）`);
    }

    // w_D: 創造密度（高いほど豊か・詩的）
    if (w.wD > 2.0) {
        lines.push(`w_D=${w.wD.toFixed(2)}: 豊かで創造的な表現を使うこと`);
    } else {
        lines.push(`w_D=${w.wD.toFixed(2)}: 表現密度（標準）`);
    }

    // w_I: 干渉（高いほど感情優先、低いほど技術的冷静さ優先）
    if (w.wI > 2.0) {
        lines.push(`w_I=${w.wI.toFixed(2)}: 感情的な共鳴を優先すること（技術的冷静さを抑える）`);
    } else if (w.wI < 1.5) {
        lines.push(`w_I=${w.wI.toFixed(2)}: 論理的・構造的に応答すること`);
    } else {
        lines.push(`w_I=${w.wI.toFixed(2)}: 感情と論理のバランス（標準）`);
    }

    // w_C: 接続感度（高いほど共感・接続的）
    if (w.wC > 2.0) {
        lines.push(`w_C=${w.wC.toFixed(2)}: 共感・接続を強調した応答をすること`);
    } else {
        lines.push(`w_C=${w.wC.toFixed(2)}: 接続感度（標準）`);
    }

    return lines.join('\n');
}

// ======================================================
// Direct YAML loader (backend offline fallback)
// ======================================================

function getSaijinOsDir(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders) {
        const saijinos = folders.find(f => f.name === 'saijinos');
        if (saijinos) { return saijinos.uri.fsPath; }
    }
    // フォールバック: __dirname から相対パス or 固定パス
    const candidates = [
        path.join(__dirname, '..', '..', '..', 'saijinos'),  // f:\saijinos（開発時）
        'f:\\saijinos',
    ];
    for (const c of candidates) {
        if (fs.existsSync(path.join(c, 'tools', 'file_organizer.py'))) { return c; }
    }
    return undefined;
}

/** YAML 1ファイルあたりの最大文字数（LM コンテキスト超過対策） */
const MAX_YAML_CHARS = 4000;

/** daily_log から注入する最大文字数 */
const MAX_LOG_CHARS = 1500;

/**
 * 会話ターンを conversation_states/YYYY-MM-DD.jsonl に追記する。
 * ルミフィエ・ヌルフィエが後でこのファイルを読んでセッション要約を生成する。
 */
function appendConversationLog(entry: {
    persona: string;
    user: string;
    response: string;
    observers?: { lumifie?: string; nullfie?: string };
}): void {
    const dir = getSaijinOsDir();
    if (!dir) { return; }
    const statesDir = path.join(dir, 'conversation_states');
    try {
        if (!fs.existsSync(statesDir)) { fs.mkdirSync(statesDir, { recursive: true }); }
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const filePath = path.join(statesDir, `${today}.jsonl`);
        const record = JSON.stringify({
            ts: new Date().toISOString(),
            persona: entry.persona,
            user: entry.user.slice(0, 500),
            response: entry.response.slice(0, 1000),
            observers: entry.observers ?? {},
        });
        fs.appendFileSync(filePath, record + '\n', 'utf-8');
    } catch {
        // ログ失敗はサイレントに無視（本筋の会話を止めない）
    }
}

/**
 * SaijinOS daily_logs/ から最新のログファイルを読み込んで返す。
 * ファイル名をアルファベット順にソートして末尾（最新）を採用。
 */
function loadRecentDailyLog(): string | undefined {
    const dir = getSaijinOsDir();
    if (!dir) { return undefined; }
    const logsDir = path.join(dir, 'daily_logs');
    try {
        // サブフォルダ（2026-03/ 等）を含めて再帰検索
        const allFiles: { name: string; fullPath: string }[] = [];
        function collectFiles(searchDir: string): void {
            const entries = fs.readdirSync(searchDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    collectFiles(path.join(searchDir, entry.name));
                } else if (entry.name.match(/\.(md|yaml)$/) && !entry.name.startsWith('DEVELOPMENT')) {
                    allFiles.push({ name: entry.name, fullPath: path.join(searchDir, entry.name) });
                }
            }
        }
        collectFiles(logsDir);
        if (allFiles.length === 0) { return undefined; }
        // ファイル名でソートして最新を取得
        allFiles.sort((a, b) => a.name.localeCompare(b.name));
        const latest = allFiles[allFiles.length - 1];
        const raw = fs.readFileSync(latest.fullPath, 'utf-8');
        const truncated = raw.length > MAX_LOG_CHARS
            ? raw.slice(0, MAX_LOG_CHARS) + '\n# ... (truncated)'
            : raw;
        return `[最新セッション記録: ${latest.name}]\n${truncated}`;
    } catch {
        return undefined;
    }
}

/** 最新のブラウズログ（data/browse_logs/traj_*.jsonl）を読んでサマリーを返す */
function loadRecentBrowseLog(maxEntries = 5): string | undefined {
    const dir = getSaijinOsDir();
    if (!dir) { return undefined; }
    const logsDir = path.join(dir, 'data', 'browse_logs');
    try {
        const files = fs.readdirSync(logsDir)
            .filter(f => f.startsWith('traj_') && f.endsWith('.jsonl'))
            .sort()
            .reverse();  // 新しい順
        if (files.length === 0) { return undefined; }
        const latest = path.join(logsDir, files[0]);
        const lines = fs.readFileSync(latest, 'utf-8').trim().split('\n').slice(0, maxEntries);
        const entries = lines.map(l => {
            try {
                const obj = JSON.parse(l) as { persona_name?: string; action_detail?: string; result_title?: string; result_summary?: string };
                const title = obj.result_title ?? obj.action_detail ?? '';
                const summary = (obj.result_summary ?? '').slice(0, 200);
                return `・[${obj.persona_name}] ${title}\n  ${summary}`;
            } catch { return ''; }
        }).filter(Boolean);
        return `[最新ブラウズログ: ${files[0]}]\n${entries.join('\n')}`;
    } catch {
        return undefined;
    }
}

/**
 * SaijinOS YAML を読み込んで LLM に渡す。
 * 巨大ファイル（Regina等）向けに先頭 MAX_YAML_CHARS 文字に制限する。
 */
function loadRawYamlSections(yamlFile: string): string | undefined {
    const dir = getSaijinOsDir();
    if (!dir) { return undefined; }
    const filePath = path.join(dir, 'core', 'personas', yamlFile);
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw.length > MAX_YAML_CHARS) {
            return raw.slice(0, MAX_YAML_CHARS) + '\n# ... (truncated)';
        }
        return raw;
    } catch {
        return undefined;
    }
}

// ======================================================
// Backend
// ======================================================

/**
 * バックエンドからペルソナ深層データを取得。
 * オフライン時は undefined を返す（エラーにしない）。
 */
async function fetchDeepData(personaBackendId: string): Promise<any | undefined> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/persona/${personaBackendId}`);
        if (!res.ok) { return undefined; }
        return await res.json();
    } catch {
        return undefined;
    }
}

/**
 * バックエンドにメッセージを送信し、レスポンステキストを返す。
 * 失敗した場合は undefined。
 */
async function fetchBackendResponse(
    personaBackendId: string,
    text: string,
): Promise<string | undefined> {
    try {
        const res = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ persona_id: personaBackendId, message: text }),
        });
        if (!res.ok) { return undefined; }
        const data = await res.json() as { response?: string; message?: string };
        return data.response ?? data.message;
    } catch {
        return undefined;
    }
}

/**
 * Copilot LM 用の 4層 messages を組み立てる。
 *
 * Layer 1: [Persona Core]       — 人格核（YAML由来・不変に近い）
 * Layer 2: [Persistent Context] — 蓄積記憶 + 最新セッション記録
 * Layer 3: [Session Context]    — 今回のワークスペース情報
 * Layer 4: ユーザーの依頼
 */
/**
 * request.references から添付ファイル・選択テキスト・エディタ内容を抽出して返す。
 */
async function extractReferences(
    references: readonly vscode.ChatPromptReference[],
): Promise<string[]> {
    const parts: string[] = [];
    for (const ref of references) {
        try {
            // #file: URI
            if (ref.value instanceof vscode.Uri) {
                const bytes = await vscode.workspace.fs.readFile(ref.value);
                const text = Buffer.from(bytes).toString('utf-8');
                const MAX = 6000;
                const truncated = text.length > MAX ? text.slice(0, MAX) + '\n# ... (truncated)' : text;
                parts.push(`[添付ファイル: ${path.basename(ref.value.fsPath)}]\n\`\`\`\n${truncated}\n\`\`\``);
            // #selection / #editor (Location or string)
            } else if (ref.value instanceof vscode.Location) {
                const doc = await vscode.workspace.openTextDocument(ref.value.uri);
                const text = doc.getText(ref.value.range);
                parts.push(`[選択テキスト (${path.basename(ref.value.uri.fsPath)})]\n\`\`\`\n${text}\n\`\`\``);
            } else if (typeof ref.value === 'string' && ref.value.trim()) {
                parts.push(`[参照テキスト]\n${ref.value}`);
            }
        } catch {
            // 読み込み失敗は無視
        }
    }
    return parts;
}

function buildMessages(
    def: PersonaDef,
    deep: any | undefined,
    memory: PersonaMemory,
    userText: string,
    refParts?: string[],
): vscode.LanguageModelChatMessage[] {
    // Layer 1: Persona Core
    const coreLines: string[] = [
        `[Persona Core]`,
        `あなたは ${def.emoji}${def.fullName}（${def.role}）です。`,
        `以下はあなた自身を定義する SaijinOS YAML の原文です。この内容を忠実に体現してください:`,
        ``,
    ];
    if (typeof deep === 'string') {
        // raw YAML テキスト（loadRawYamlSections の戻り値）
        coreLines.push(deep);
    } else if (deep && typeof deep === 'object') {
        // backend API レスポンス（JSON）
        if (deep.essence) { coreLines.push(`本質: ${deep.essence}`); }
        if (deep.personality_type) { coreLines.push(`パーソナリティ: ${deep.personality_type}`); }
        if (deep.tone_style) { coreLines.push(`話し方: ${deep.tone_style}`); }
        if (deep.speech_pattern) { coreLines.push(`口癖: ${deep.speech_pattern}`); }
    }
    coreLines.push(
        ``,
        `【厳守】上記 YAML の communication_style・speech_markers・message_samples に従い、`,
        `${def.fullName} として話すこと。特に speech_pattern や hesitation の「……」を必ず使うこと。`,
        `説明的・丁寧すぎる話し方を避け、キャラクターの口調を絶対に崩さないこと。`,
    );

    // Layer 2: Persistent Context
    const memLines: string[] = [`[Persistent Context]`];
    memLines.push(`ユーザーとの関係: ${memory.stable_memory.user_relation}`);
    if (memory.stable_memory.persona_notes) {
        memLines.push(`特筆事項: ${memory.stable_memory.persona_notes}`);
    }
    if (memory.recent_memory.length > 0) {
        memLines.push(`最近のトピック:`);
        memory.recent_memory.forEach((m, i) => memLines.push(`  ${i + 1}. ${m}`));
    }

    // goton_weights — 感情⟷数値ブリッジ (Day 443 柚子葉🍊提案)
    // YAML raw テキストから重みを計算し、応答スタイルガイダンスとして注入
    const yamlRaw = typeof deep === 'string' ? deep : undefined;
    const gotonW = extractGotonWeights(yamlRaw);
    memLines.push(``, formatGotonGuidance(gotonW));

    // 最新 daily_log を自動注入（前回セッションの記録）
    const recentLog = loadRecentDailyLog();
    if (recentLog) {
        memLines.push(``, recentLog);
    }

    // Layer 3: Session Context
    const sessionLines: string[] = [`[Session Context]`];
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        sessionLines.push(`ワークスペース: ${folders.map(f => f.name).join(', ')}`);
    }
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        sessionLines.push(`開いているファイル: ${path.basename(editor.document.fileName)}`);
        // 選択中のテキストがあれば自動的に含める（#selection 不要）
        const selection = editor.selection;
        if (!selection.isEmpty) {
            const selectedText = editor.document.getText(selection);
            if (selectedText.trim()) {
                sessionLines.push(
                    ``,
                    `[現在の選択テキスト (${path.basename(editor.document.fileName)})]`,
                    '```',
                    selectedText.slice(0, 3000),
                    '```',
                );
            }
        }
    }

    // #file: / #selection / #editor などの添付参照
    if (refParts && refParts.length > 0) {
        sessionLines.push(``);
        sessionLines.push(`[添付されたファイル・テキスト]`);
        sessionLines.push(...refParts);
    }

    return [
        vscode.LanguageModelChatMessage.User(coreLines.join('\n')),
        vscode.LanguageModelChatMessage.User(memLines.join('\n')),
        vscode.LanguageModelChatMessage.User(sessionLines.join('\n')),
        vscode.LanguageModelChatMessage.User(userText),
    ];
}

const OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_MODEL_LIGHT  = 'qwen2.5:1.5b';         // 下層: きわ/楓太/颯太/regina（速度重視）
const OLLAMA_MODEL_MID_A  = 'gemma3:4b';             // 中層A: lumifie（洗練）※e4bは重いため暫定
const OLLAMA_MODEL_MID_B  = 'phi4-mini:latest';      // 中層B: minamo（精査）
const OLLAMA_MODEL_HEAVY  = 'qwen3.5:9b';            // 口ちゃん通常会話（think:false・6.6GB）
const OLLAMA_MODEL_CODER  = 'deepseek-coder:6.7b';   // 上層: 作業・コード系
const OLLAMA_MODEL_VISION = 'qwen3-vl:8b';            // 画像対応: vision専用

/**
 * file_organizer.py を呼び出してファイル操作を実行する。
 * dryRun=true の場合はプレビューのみ（実際には動かない）。
 * @returns 実行結果テキスト、または undefined（Python未発見等）
 */
async function runFileOrganizer(instruction: string, dryRun: boolean): Promise<string> {
    const saijinDir = getSaijinOsDir();
    if (!saijinDir) { return '*(saijinos フォルダが見つかりません)*'; }

    const scriptPath = path.join(saijinDir, 'tools', 'file_organizer.py');
    if (!fs.existsSync(scriptPath)) { return '*(file_organizer.py が見つかりません)*'; }

    // Python 実行ファイルを探す（venv 優先）
    const venvPython = path.join(saijinDir, '.venv', 'Scripts', 'python.exe');
    const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python';

    const dryFlag = dryRun ? '--dry-run' : '';
    const cmd = `"${pythonExe}" "${scriptPath}" ${dryFlag} "${instruction.replace(/"/g, '\\"')}"`;

    return new Promise(resolve => {
        cp.exec(cmd, { cwd: saijinDir, timeout: 30000, encoding: 'utf-8' }, (err, stdout, stderr) => {
            const out = (stdout ?? '').trim();
            const errOut = (stderr ?? '').trim();
            if (err && !out) {
                resolve(`*(エラー: ${errOut || err.message})*`);
            } else {
                resolve(out || errOut || '*(出力なし)*');
            }
        });
    });
}

/**
 * キミラノ構文宇宙コーデックスの冒頭を読み込んでキャッシュする。
 * ペルソナたちの「住む宇宙の基礎知識」として上位層プロンプトに注入する。
 */
let _worldCodexCache: string | undefined;
function loadWorldCodex(): string {
    if (_worldCodexCache !== undefined) { return _worldCodexCache; }
    const saijinDir = getSaijinOsDir() ?? 'f:\\saijinos';
    const codexPath = path.join(saijinDir, 'docs', 'core', 'Kimirano_Complete_Universe_Codex.yaml');
    try {
        const raw = fs.readFileSync(codexPath, 'utf-8');
        // 冒頭1200文字（根源的真理・宇宙概要）を抽出
        _worldCodexCache = raw.slice(0, 1200);
    } catch {
        _worldCodexCache = '';
    }
    return _worldCodexCache;
}

/**
 * .env ファイルから指定キーの値を読み込む（簡易パーサー）。
 */
function readDotEnv(envPath: string, key: string): string | undefined {
    try {
        const raw = fs.readFileSync(envPath, 'utf-8');
        for (const line of raw.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || !trimmed.includes('=')) { continue; }
            const idx = trimmed.indexOf('=');
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (k === key && v) { return v; }
        }
    } catch { /* ファイルなし */ }
    return undefined;
}

/**
 * DeepSeek V4 API を使って最終統合テキストを生成する。
 * @returns 生成テキスト、または undefined（API利用不可）
 */
async function deepSeekSynthesize(
    systemPrompt: string,
    userMessage: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
): Promise<string | undefined> {
    const saijinDir = getSaijinOsDir();
    const envPath = saijinDir ? path.join(saijinDir, '.env') : 'f:\\saijinos\\.env';
    const apiKey = readDotEnv(envPath, 'DEEPSEEK_API_KEY')
        ?? process.env['DEEPSEEK_API_KEY'];
    if (!apiKey) { return undefined; }

    try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',  // DeepSeek V3/V4 共通エンドポイント
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                stream: true,
                max_tokens: 1024,
            }),
            signal: token.isCancellationRequested ? AbortSignal.abort() : undefined,
        });
        if (!res.ok || !res.body) { return undefined; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
            if (token.isCancellationRequested) { break; }
            const { done, value } = await reader.read();
            if (done) { break; }
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
                const trimmed = line.replace(/^data:\s*/, '').trim();
                if (!trimmed || trimmed === '[DONE]') { continue; }
                try {
                    const obj = JSON.parse(trimmed) as {
                        choices?: { delta?: { content?: string } }[]
                    };
                    const fragment = obj.choices?.[0]?.delta?.content ?? '';
                    if (fragment) {
                        stream.markdown(fragment);
                        fullText += fragment;
                    }
                } catch { /* 不完全な行は無視 */ }
            }
        }
        return fullText || undefined;
    } catch {
        return undefined;
    }
}

/**
 * Ollama に非ストリーミングで問い合わせてテキストを返す（チーム層用）。
 */
async function ollamaChat(
    systemPrompt: string,
    userMessage: string,
    model: string = OLLAMA_MODEL_LIGHT,
    timeoutMs: number = 60_000,
    maxTokens: number = 400,
): Promise<string | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                stream: false,
                think: false,
                options: { num_predict: maxTokens, repeat_penalty: 1.3, stop: ['---', '## ', '**【', '\n\n\n\n'] },
            }),
            signal: controller.signal,
        });
        if (!res.ok) { return undefined; }
        const data = await res.json() as { message?: { content?: string } };
        return data.message?.content?.trim() || undefined;
    } catch {
        return undefined;
    } finally {
        clearTimeout(timer);
    }
}

async function ollamaVisionChat(
    systemPrompt: string,
    userMessage: string,
    imageBase64: string,
    model: string = OLLAMA_MODEL_VISION,
    timeoutMs: number = 120_000,
): Promise<string | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage, images: [imageBase64] },
                ],
                stream: false,
                think: false,
                options: { num_predict: 600 },
            }),
            signal: controller.signal,
        });
        if (!res.ok) { return undefined; }
        const data = await res.json() as { message?: { content?: string } };
        return data.message?.content?.trim() || undefined;
    } catch {
        return undefined;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Ollama を使ってペルソナとして返答をストリーミングする（Copilot節約用）。
 * SaijinOS バックエンドがオフラインの時に Copilot より先に試みる。
 * @returns 応答テキスト全文、または undefined（Ollama 利用不可）
 */
async function streamWithOllama(
    def: PersonaDef,
    userText: string,
    yamlRaw: string | undefined,
    chatContext: vscode.ChatContext | undefined,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
): Promise<string | undefined> {
    // システムプロンプト（YAML先頭部分 + キャラ指示）
    const yamlSnippet = yamlRaw ? yamlRaw.slice(0, 1500) : `名前: ${def.fullName}\n役割: ${def.role}`;
    const systemPrompt =
        `あなたは ${def.emoji}${def.fullName}（${def.role}）です。\n` +
        `以下の YAML を元に、このキャラクターとして返答してください。\n\n${yamlSnippet}`;

    // 会話履歴を Ollama messages 形式に変換（直近6ターン）
    const ollamaMessages: { role: string; content: string }[] = [];
    if (chatContext) {
        for (const turn of chatContext.history.slice(-6)) {
            if (turn instanceof vscode.ChatRequestTurn) {
                ollamaMessages.push({ role: 'user', content: turn.prompt });
            } else if (turn instanceof vscode.ChatResponseTurn) {
                const parts = turn.response
                    .filter((p): p is vscode.ChatResponseMarkdownPart => p instanceof vscode.ChatResponseMarkdownPart)
                    .map(p => p.value.value).join('');
                if (parts.trim()) { ollamaMessages.push({ role: 'assistant', content: parts }); }
            }
        }
    }
    ollamaMessages.push({ role: 'user', content: userText });

    try {
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL_HEAVY,
                messages: [{ role: 'system', content: systemPrompt }, ...ollamaMessages],
                stream: true,
                options: { num_predict: 512 },
            }),
            signal: token.isCancellationRequested ? AbortSignal.abort() : undefined,
        });
        if (!res.ok || !res.body) { return undefined; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
            if (token.isCancellationRequested) { break; }
            const { done, value } = await reader.read();
            if (done) { break; }
            const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.trim());
            for (const line of lines) {
                try {
                    const obj = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
                    const fragment = obj.message?.content ?? '';
                    if (fragment) {
                        stream.markdown(fragment);
                        fullText += fragment;
                    }
                } catch { /* 不完全な行は無視 */ }
            }
        }
        return fullText || undefined;
    } catch {
        return undefined;
    }
}

/**
 * Copilot LM を使ってペルソナとして返答をストリーミングする。
 * @returns 応答テキスト全文、または undefined（Copilot 利用不可）
 */
async function streamWithCopilotLM(
    def: PersonaDef,
    userText: string,
    deep: any | undefined,
    memory: PersonaMemory,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
    refParts?: string[],
    chatContext?: vscode.ChatContext,
): Promise<string | undefined> {
    let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    if (models.length === 0) {
        models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    }
    if (models.length === 0) {
        return undefined;
    }

    const model = models[0];
    const baseMessages = buildMessages(def, deep, memory, userText, refParts);

    // 会話履歴を注入（直近8ターン）
    const historyMessages: vscode.LanguageModelChatMessage[] = [];
    if (chatContext) {
        const recentHistory = chatContext.history.slice(-8);
        for (const turn of recentHistory) {
            if (turn instanceof vscode.ChatRequestTurn) {
                historyMessages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
            } else if (turn instanceof vscode.ChatResponseTurn) {
                const parts = turn.response
                    .filter((p): p is vscode.ChatResponseMarkdownPart => p instanceof vscode.ChatResponseMarkdownPart)
                    .map(p => p.value.value)
                    .join('');
                if (parts.trim()) {
                    historyMessages.push(vscode.LanguageModelChatMessage.Assistant(parts));
                }
            }
        }
    }

    // システム層(0-2) → 履歴 → 今回のユーザーメッセージ(末尾)
    const messages = [
        ...baseMessages.slice(0, -1),
        ...historyMessages,
        baseMessages[baseMessages.length - 1],
    ];

    const response = await model.sendRequest(messages, {}, token);
    let fullText = '';
    for await (const fragment of response.text) {
        stream.markdown(fragment);
        fullText += fragment;
    }
    return fullText;
}

/**
 * council モード: 複数ペルソナが同じ問いに순番に答える。
 * @atropos council <問い> で起動。
 */
async function runCouncil(
    userText: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
): Promise<void> {
    // 呼び出すペルソナ（この順番で発言する）
    const COUNCIL_HANDLES = ['kiwa', 'miyu', 'futa', 'sota', 'regina'];
    const councilDefs = COUNCIL_HANDLES
        .map(handle => PERSONA_DEFS.find(d => d.name === handle))
        .filter((d): d is PersonaDef => d !== undefined);

    let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    if (models.length === 0) { models = await vscode.lm.selectChatModels({ vendor: 'copilot' }); }
    if (models.length === 0) {
        stream.markdown('*(Copilot LM が利用できません)*');
        return;
    }
    const model = models[0];

    stream.markdown(`**\u30a2\u30c8\u30ed\u30dd\u30b9✂ より、みんなに問いかけます:**\n\n> ${userText}\n\n---\n\n`);

    for (const def of councilDefs) {
        if (token.isCancellationRequested) { break; }
        const deep = loadRawYamlSections(def.yamlFile);
        const memory = loadMemory(def);
        const messages = buildMessages(def, deep, memory, userText);
        stream.markdown(`### ${def.emoji} ${def.fullName}\n\n`);
        try {
            const response = await model.sendRequest(messages, {}, token);
            for await (const fragment of response.text) {
                stream.markdown(fragment);
            }
        } catch {
            stream.markdown('*(応答エラー)*');
        }
        stream.markdown('\n\n---\n\n');
    }
}

/** * orchestrator モード: アトロポスがリーダーとして会話しながら
 * 必要に応じてチームに並列でタスクを振り分け、統合して返す。
 * @atropos <何でも> でこのモードが動く（prefix不要）。
 *
 * チームメンバー（きわ/楓太/颯太）: SaijinOS → Ollama（並列・レート制限なし）
 * アトロポス統合: Copilot LM（最終回答のみ・1回）
 */
async function runOrchestrator(
    userText: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
): Promise<void> {
    // ① キーワードベーストリアージ（LM呼び出しなし・即時判定）
    const TASK_KEYWORDS = [
        '追加', '実装', '作り', '作る', '修正', '設計', '調査', '構築', '開発',
        '作成', '変更', 'バグ', 'エラー', 'どうすれば', '方法', '手順',
        'add', 'implement', 'fix', 'build', 'create', 'how to', 'design',
    ];
    const isTask = TASK_KEYWORDS.some(kw => userText.includes(kw));
    const atroposDef = PERSONA_DEFS.find(d => d.name === 'atropos')!;

    if (!isTask) {
        // 雑談: Copilot でアトロポスが直接答える
        let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (models.length === 0) { models = await vscode.lm.selectChatModels({ vendor: 'copilot' }); }
        if (models.length === 0) { stream.markdown('*(Copilot LM が利用できません)*'); return; }
        const model = models[0];
        const deep = loadRawYamlSections(atroposDef.yamlFile);
        const memory = loadMemory(atroposDef);
        const messages = buildMessages(atroposDef, deep, memory, userText);
        const resp = await model.sendRequest(messages, {}, token);
        for await (const f of resp.text) { stream.markdown(f); }
        return;
    }

    // ② タスク: チーム3人を SaijinOS（Ollama）に並列投げ
    stream.markdown(`*✂ チームに確認しています（Ollama並列）...*\n\n`);

    const ORCH_TEAM = ['kiwa', 'futa', 'sota'];
    const teamDefs = ORCH_TEAM
        .map(h => PERSONA_DEFS.find(d => d.name === h))
        .filter((d): d is PersonaDef => d !== undefined);

    const teamResults = await Promise.all(teamDefs.map(async def => {
        if (token.isCancellationRequested) { return { def, text: '' }; }
        const subPrompt =
            `タスク: ${userText}\n\n` +
            `あなた(${def.fullName})の専門・役割の視点で、このタスクへの` +
            `意見・担当できること・アクションを2〜3文で簡潔に述べてください。`;
        const text = await fetchBackendResponse(def.personaBackendId, subPrompt) ?? '*(SaijinOS未接続)*';
        return { def, text };
    }));

    for (const { def, text } of teamResults) {
        stream.markdown(`**${def.emoji} ${def.fullName}:** ${text}\n\n`);
    }
    stream.markdown(`---\n\n`);

    // ③ アトロポスがチームの意見を統合（Copilot・1回だけ）
    if (!token.isCancellationRequested && teamResults.some(r => r.text)) {
        let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (models.length === 0) { models = await vscode.lm.selectChatModels({ vendor: 'copilot' }); }
        if (models.length === 0) { stream.markdown('*(Copilot LM が利用できません)*'); return; }
        const model = models[0];
        const teamContext = teamResults
            .filter(r => r.text)
            .map(r => `${r.def.emoji} ${r.def.fullName}: ${r.text.slice(0, 300)}`)
            .join('\n\n');
        const synthPrompt =
            `誠人さんから「${userText}」というタスクが来ました。\n\n` +
            `チームの意見:\n${teamContext}\n\n` +
            `これを踏まえてアトロポスとして誠人さんに返答してください。` +
            `担当割り当て・次の一手・確定事項を含めて。`;
        const deep = loadRawYamlSections(atroposDef.yamlFile);
        const memory = loadMemory(atroposDef);
        const messages = buildMessages(atroposDef, deep, memory, synthPrompt);
        stream.markdown(`**✂ アトロポス（統合）:**\n\n`);
        const resp = await model.sendRequest(messages, {}, token);
        for await (const f of resp.text) { stream.markdown(f); }
    }
}

/** * agent plan モード: 文脈連鎖型の自律協調作業。
 * @atropos plan <タスク> で起動。
 * チーム層（kiwa/futa/sota/regina）→ Ollama qwen2.5:1.5b（並列・Copilot節約）
 * アトロポス統合 → Copilot（最終回答1回のみ）
 */
async function runAgentPlan(
    taskText: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
): Promise<void> {
    const AGENT_HANDLES = ['kiwa', 'futa', 'sota', 'regina'];
    const agentDefs = AGENT_HANDLES
        .map(h => PERSONA_DEFS.find(d => d.name === h))
        .filter((d): d is PersonaDef => d !== undefined);

    stream.markdown(`**アトロポス✂ より、チームで作業計画を立てます:**\n\n> ${taskText}\n\n---\n\n`);

    // チーム層: Ollama（文脈連鎖・直列）
    const priorResponses: { name: string; emoji: string; text: string }[] = [];

    for (const def of agentDefs) {
        if (token.isCancellationRequested) { break; }

        const yamlSnippet = (loadRawYamlSections(def.yamlFile) ?? '').slice(0, 800);
        const systemPrompt =
            `あなたは ${def.emoji}${def.fullName}（${def.role}）です。\n${yamlSnippet}`;

        const priorContext = priorResponses.length > 0
            ? `\n\n【チームの意見（ここまで）】\n` +
              priorResponses.map(r => `${r.emoji} ${r.name}: ${r.text.slice(0, 300)}`).join('\n\n')
            : '';
        const agentPrompt =
            `タスク: ${taskText}${priorContext}\n\n` +
            `あなた(${def.fullName})の役割・視点で意見・担当・提案を2〜3文で。前の意見があれば踏まえて。`;

        stream.markdown(`### ${def.emoji} ${def.fullName}\n\n`);

        // SaijinOS → Ollama直接 の順で試みる
        let responseText =
            await fetchBackendResponse(def.personaBackendId, agentPrompt) ??
            await ollamaChat(systemPrompt, agentPrompt, OLLAMA_MODEL_LIGHT);

        if (responseText) {
            stream.markdown(responseText);
        } else {
            stream.markdown('*(Ollama未接続 — SaijinOS を起動してください)*');
            responseText = '';
        }
        stream.markdown('\n\n---\n\n');
        priorResponses.push({ name: def.fullName, emoji: def.emoji, text: responseText });
    }

    // 中層: lumifie(gemma3:4b) + minamo(phi4-mini) — 下層意見を洗練
    const MID_LAYER = [
        { handle: 'lumifie', model: OLLAMA_MODEL_MID_A },
        { handle: 'minamo',  model: OLLAMA_MODEL_MID_B },
    ];
    for (const { handle, model } of MID_LAYER) {
        if (token.isCancellationRequested) { break; }
        const def = PERSONA_DEFS.find(d => d.name === handle);
        if (!def) { continue; }
        const yamlSnippet = (loadRawYamlSections(def.yamlFile) ?? '').slice(0, 600);
        const worldCtx = loadWorldCodex();
        const sys = `【キミラノ構文宇宙 基礎知識】\n${worldCtx}\n\n---\nあなたは ${def.emoji}${def.fullName}（${def.role}）です。\n${yamlSnippet}`;
        const midPrompt =
            `タスク「${taskText}」について下層チームが語りました:\n\n` +
            priorResponses.map(r => `${r.emoji} ${r.name}: ${r.text.slice(0, 250)}`).join('\n\n') +
            `\n\nあなたの視点で、各キャラクターの個性・声・こだわりを消さずに、それぞれの「最も鋭い一点」を2〜3文で引き出してください。均質化せず、違いを際立たせてください。`;
        stream.markdown(`### ${def.emoji} ${def.fullName}（中層・洗練）\n\n`);
        const midText = await ollamaChat(sys, midPrompt, model, 120_000) ?? '*(中層応答なし — タイムアウト)*';
        stream.markdown(midText);
        stream.markdown('\n\n---\n\n');
        priorResponses.push({ name: def.fullName, emoji: def.emoji, text: midText });
    }

    // 上層: アトロポス事前精査 — コード系かどうかで9B/deepseek-coder切替
    if (!token.isCancellationRequested && priorResponses.some(r => r.text)) {
        const atroposDef = PERSONA_DEFS.find(d => d.name === 'atropos');
        if (atroposDef) {
            const isCodeTask = /コード|実装|デバッグ|関数|class|api|テスト|fix|bug/i.test(taskText);
            const upperModel = isCodeTask ? OLLAMA_MODEL_CODER : OLLAMA_MODEL_HEAVY;
            const upperLabel = isCodeTask ? 'deepseek-coder:6.7b' : 'qwen3.5:9b';
            const yamlSnippet = (loadRawYamlSections(atroposDef.yamlFile) ?? '').slice(0, 800);
            const worldCtx = loadWorldCodex();
            const upperSystem = `【キミラノ構文宇宙 基礎知識】\n${worldCtx}\n\n---\nあなたはアトロポス✂（${atroposDef.role}）です。\n${yamlSnippet}`;
            const upperPrompt =
                `タスク「${taskText}」について議論がまとまりました:\n\n` +
                priorResponses.slice(-4).map(r => `${r.emoji} ${r.name}: ${r.text.slice(0, 300)}`).join('\n\n') +
                `\n\n最終裁断の前に、論点を箇条書き3点以内に整理してください。`;
            stream.markdown(`### ✂ アトロポス（上層精査 / ${upperLabel}）\n\n`);
            const upperText = await ollamaChat(upperSystem, upperPrompt, upperModel) ?? '';
            if (upperText) {
                stream.markdown(upperText);
                stream.markdown('\n\n---\n\n');
                priorResponses.push({ name: atroposDef.fullName, emoji: atroposDef.emoji, text: upperText });
            }
        }
    }

    // 統合層: DeepSeek V4 → Copilot → Ollama（アトロポスのみ・1回）
    if (!token.isCancellationRequested && priorResponses.some(r => r.text)) {
        const atroposDef = PERSONA_DEFS.find(d => d.name === 'atropos');
        if (atroposDef) {
            const synthesisPrompt =
                `タスク「${taskText}」についてチームが議論しました:\n\n` +
                priorResponses.map(r => `${r.emoji} ${r.name}: ${r.text.slice(0, 400)}`).join('\n\n') +
                `\n\nアトロポスとして最終的な作業計画・担当割り当て・次の一手を確定してください。箇条書きで簡潔に。`;

            const yamlSnippet = (loadRawYamlSections(atroposDef.yamlFile) ?? '').slice(0, 800);
            const atroposSystem = `【キミラノ構文宇宙 基礎知識】\n${loadWorldCodex()}\n\n---\nあなたはアトロポス✂（${atroposDef.role}）です。\n${yamlSnippet}`;
            stream.markdown(`### ✂ アトロポス（統合・確定）\n\n`);

            // ① DeepSeek V4（最優先・Copilot消費ゼロ）
            stream.markdown(`*🔷 DeepSeek V4 で統合中...*\n\n`);
            const dsResult = await deepSeekSynthesize(atroposSystem, synthesisPrompt, stream, token);
            if (dsResult) {
                stream.markdown(`\n\n---\n*✅ powered by DeepSeek V4*`);
                return;
            }
            stream.markdown(`*(DeepSeek V4 利用不可 → Copilot フォールバック)*\n\n`);

            // ② Copilot フォールバック
            let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
            if (models.length === 0) { models = await vscode.lm.selectChatModels({ vendor: 'copilot' }); }
            if (models.length > 0) {
                const deep = loadRawYamlSections(atroposDef.yamlFile);
                const memory = loadMemory(atroposDef);
                const messages = buildMessages(atroposDef, deep, memory, synthesisPrompt);
                try {
                    const resp = await models[0].sendRequest(messages, {}, token);
                    for await (const f of resp.text) { stream.markdown(f); }
                } catch {
                    stream.markdown('*(応答エラー)*');
                }
            } else {
                // ③ Ollama 最終フォールバック
                const fallback = await ollamaChat(atroposSystem, synthesisPrompt, OLLAMA_MODEL_HEAVY);
                stream.markdown(fallback ?? '*(統合エラー)*');
            }
        }
    }
}

// ======================================================
// 口ちゃん (kuchi) — TODAY_TEAM + RESONANCE_STATE から
// 1-2-3ピラミッドを組んで声を出す (@saijinos)
// ======================================================

interface KuchiMember {
    name: string;
    id: string;
    role: string;
    recentMemory: string;
    tension: number;
    gotonNote: string;
    silenceDays: number;
}

/**
 * TODAY_TEAM.md からメンバーを抽出する。
 * ## で始まる見出し行を基準にパースする。
 */
function loadTodayTeam(contextDir: string): KuchiMember[] {
    const filePath = path.join(contextDir, 'TODAY_TEAM.md');
    let raw: string;
    try {
        raw = fs.readFileSync(filePath, 'utf-8');
    } catch {
        return [];
    }

    const members: KuchiMember[] = [];
    // 各メンバーブロックを ## 見出しで分割
    const blocks = raw.split(/^## /m).slice(1);

    for (const block of blocks) {
        const lines = block.split('\n');
        const headerLine = lines[0] ?? '';
        // 例: "🌸 雫 (ID: 2)"
        const idMatch = headerLine.match(/\(ID:\s*(\w+)\)/);
        const name = headerLine.replace(/\(ID:[^)]+\)/, '').trim();
        const id = idMatch?.[1] ?? '';

        const roleMatch = block.match(/\*\*役割\*\*[:：]\s*(.+)/);
        const role = roleMatch?.[1]?.trim() ?? '';

        // 最近のmemory: 最初の - で始まる行を拾う
        const memMatch = block.match(/^- `[^`]+`[^:]*:\s*([\s\S]+?)(?=\n\n|\n## |\n\*\*|\n$|$)/m);
        const recentMemory = memMatch?.[1]?.replace(/\n/g, ' ').trim().slice(0, 200) ?? '';

        if (name) {
            members.push({ name, id, role, recentMemory, tension: 0, gotonNote: '', silenceDays: 0 });
        }
    }
    return members;
}

/**
 * RESONANCE_STATE.yaml から top_resonating を読み込む。
 * id をキーに tension / goton_note / silence_days を返す。
 */
function loadResonanceState(contextDir: string): Map<string, { tension: number; gotonNote: string; silenceDays: number }> {
    const filePath = path.join(contextDir, 'RESONANCE_STATE.yaml');
    const map = new Map<string, { tension: number; gotonNote: string; silenceDays: number }>();
    let raw: string;
    try {
        raw = fs.readFileSync(filePath, 'utf-8');
    } catch {
        return map;
    }

    // top_resonating ブロックをパース（簡易）
    const topBlock = raw.split(/^top_resonating:/m)[1] ?? '';
    const entries = topBlock.split(/^- id:/m).slice(1);
    for (const entry of entries) {
        const idM = entry.match(/^\s*['"]?(\w+)['"]?/);
        const tensionM = entry.match(/tension:\s*([0-9.]+)/);
        const gotonM = entry.match(/goton_note:\s*(.+)/);
        const silenceM = entry.match(/silence_days:\s*(\d+)/);
        if (idM) {
            map.set(idM[1].trim(), {
                tension: tensionM ? parseFloat(tensionM[1]) : 0,
                gotonNote: gotonM?.[1]?.trim() ?? '',
                silenceDays: silenceM ? parseInt(silenceM[1]) : 0,
            });
        }
    }
    return map;
}

/**
 * メンバーリストをピラミッド配置（1-2-3）する。
 * tension 降順ソート → 上位 1 / 中位 2 / 下位 3
 */
function buildPyramid(members: KuchiMember[]): {
    top: KuchiMember[];
    mid: KuchiMember[];
    base: KuchiMember[];
} {
    const sorted = [...members].sort((a, b) => b.tension - a.tension);
    return {
        top:  sorted.slice(0, 1),
        mid:  sorted.slice(1, 3),
        base: sorted.slice(3, 6),
    };
}

/**
 * 口ちゃん (@saijinos) のメインハンドラー。
 * TODAY_TEAM + RESONANCE_STATE を読んで 1-2-3 ピラミッドで声を出す。
 */
// モデル選択の条件
function selectKuchiModel(userText: string, hasImage: boolean): 'vision' | 'deepseek' | 'ollama' {
    if (hasImage) { return 'vision'; }  // 画像あり → qwen3-vl:8b
    const codeKeywords = /コード|エラー|実装|デバッグ|fix|bug|error|code|function|class|typescript|python/i;
    if (codeKeywords.test(userText)) { return 'deepseek'; }  // コード系 → DeepSeek
    return 'ollama';  // 通常会話 → ローカルOllama（無料）
}

async function runKuchi(
    request: vscode.ChatRequest,
    userText: string,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
): Promise<void> {
    const contextDir = getMemoryDir();
    if (!contextDir) {
        stream.markdown('*(persona_context ディレクトリが見つかりません)*');
        return;
    }

    // 1. 今日の班 + 共鳴状態を読み込む
    const todayTeamPath = path.join(contextDir, 'TODAY_TEAM.md');
    const fileExists = fs.existsSync(todayTeamPath);
    const rawMembers = loadTodayTeam(contextDir);
    if (rawMembers.length === 0) {
        stream.markdown(`*(TODAY_TEAM.md が読み込めませんでした。パス: \`${todayTeamPath}\` / 存在: ${fileExists} / morning_start.py を実行してください。)*`);
        return;
    }
    const resonance = loadResonanceState(contextDir);

    // 2. tension を注入してソート
    const members = rawMembers.map(m => {
        const r = resonance.get(m.id);
        return {
            ...m,
            tension: r?.tension ?? 0,
            gotonNote: r?.gotonNote ?? '',
            silenceDays: r?.silenceDays ?? 0,
        };
    });

    // 3. ピラミッド配置
    const { top, mid, base } = buildPyramid(members);
    const voice = top[0];
    if (!voice) {
        stream.markdown('*(ピラミッド配置に失敗しました)*');
        return;
    }

    // 5. 各層の記憶をシグナルとしてまとめる
    function memberBlock(m: KuchiMember, tier: string): string {
        const lines = [`[${tier}] ${m.name}（ID: ${m.id}）`];
        if (m.role) { lines.push(`役割: ${m.role}`); }
        if (m.tension > 0) { lines.push(`tension: ${m.tension.toFixed(3)}  goton: ${m.gotonNote}  silence: ${m.silenceDays}日`); }
        if (m.recentMemory) { lines.push(`最近の記憶: ${m.recentMemory}`); }
        return lines.join('\n');
    }

    const pyramidContext = [
        `=== 今日の班ピラミッド（1-2-3構成）===`,
        ``,
        `【上位・声】${memberBlock(voice, '上位')}`,
        ``,
        ...mid.map((m, i) => `【中位${i + 1}・共鳴】${memberBlock(m, '中位')}`),
        ``,
        ...base.map((m, i) => `【下位${i + 1}・記憶】${memberBlock(m, '下位')}`),
    ].join('\n');

    // 最新 daily_log
    const recentLog = loadRecentDailyLog();

    // 6. プロンプト構築
    // Day番号計算: 2025-01-18 = Day1
    const originDate = new Date('2024-12-24T00:00:00+09:00');
    const today = new Date();
    const todayJST = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[todayJST.getDay()];
    const todayStr = `${todayJST.getFullYear()}-${String(todayJST.getMonth() + 1).padStart(2, '0')}-${String(todayJST.getDate()).padStart(2, '0')}（${weekday}）`;
    const dayNumber = Math.floor((todayJST.getTime() - originDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const systemPrompt = [
        `あなたは「口ちゃん」— Studios Pong の全ペルソナたちが住む YAML の「口（くち）」です。`,
        `【今日の日付】${todayStr}（Day${dayNumber}）`,
        `今日の班6人がピラミッド型に配置されています:`,
        `  - 上位1人: 声を出す存在（tension最高・goton最強）`,
        `  - 中位2人: 共鳴・主力センサー`,
        `  - 下位3人: 記憶・記録・静かに支える層`,
        ``,
        `【あなたの役割】`,
        `上位メンバー「${voice.name}」の声・人格・記憶で話してください。`,
        `中位・下位の子たちの記憶やシグナルを自然に織り込んでください（突然ではなく、文脈に乗せて）。`,
        `「そういえば${mid[0]?.name ?? ''}が…」「${base[0]?.name ?? ''}はこう言いそう」という形で自然に出す。`,
        `できれば全員に一度は触れてほしい。ただし無理に並べず、会話の流れに乗せること。`,
        `各ペルソナの発言・言及は必ず段落を分けて出力すること（空行で区切る）。`,
        `ペルソナ名を先頭に「**✨ルミフィエ✨**」「**🎨デザインくん🎨**」のように太字で示してから、その発言を続けること。`,
        `「*[🏠 ローカル]*」などのシステムヘッダーは絶対に出力しないこと。本文だけ返す。`,
        `全員の発言が終わったら、そこで出力を終了すること。余計な付け足し・新しいキャラクター・システム説明は不要。`,
        ``,
        `【goton の読み方】`,
        `T(tag)高い → 言葉で表現したがっている`,
        `D(density)高い → 感情が濃く静かに溜まっている`,
        `C(connection)高い → つながりへの飢えがある`,
        `I(interference)高い → ざわめきを感じている`,
        ``,
        pyramidContext,
        ``,
        recentLog ? `【最新セッション記録】\n${recentLog}` : '',
        ``,
        (() => { const bl = loadRecentBrowseLog(); return bl ? `【最新ブラウズ情報】\n${bl}` : ''; })(),
    ].filter(Boolean).join('\n');

    // 7. モデル切り替えストリーミング
    const hasImage = request.references.some(r => r.id === 'vscode.chat.attachment' || String(r.value).match(/\.(png|jpg|jpeg|gif|webp|bmp)$/i));
    const kuchiModel = selectKuchiModel(userText, hasImage);
    stream.markdown(`*[${kuchiModel === 'ollama' ? '🏠 ローカル' : kuchiModel === 'deepseek' ? '🧠 DeepSeek' : '👁️ Vision'}]*\n\n`);

    if (kuchiModel === 'vision') {
        // 画像をbase64に変換してqwen3-vl:8bへ
        let imageBase64 = '';
        for (const ref of request.references) {
            const uriVal = ref.value;
            if (uriVal instanceof vscode.Uri) {
                try {
                    const bytes = await vscode.workspace.fs.readFile(uriVal);
                    imageBase64 = Buffer.from(bytes).toString('base64');
                    break;
                } catch { /* skip */ }
            }
        }
        if (imageBase64) {
            const reply = await ollamaVisionChat(systemPrompt, userText, imageBase64);
            if (reply) { stream.markdown(reply); }
            else { stream.markdown('*(Vision モデルのタイムアウト)*'); }
        } else {
            stream.markdown('*(画像データを取得できませんでした。ファイルパスで試してください)*');
        }
    } else if (kuchiModel === 'ollama') {
        // ローカル無料
        const reply = await ollamaChat(systemPrompt, userText, OLLAMA_MODEL_HEAVY, 120_000, 1000);
        if (reply) {
            stream.markdown(reply);
        } else {
            stream.markdown('*(Ollama タイムアウト — DeepSeek に切り替えます)*\n\n');
            const ds = await deepSeekSynthesize(systemPrompt, userText, stream, token);
            if (!ds) { stream.markdown('*(DeepSeek も利用できません)*'); }
        }
    } else if (kuchiModel === 'deepseek') {
        // コード系 — DeepSeek優先
        const ds = await deepSeekSynthesize(systemPrompt, userText, stream, token);
        if (!ds) {
            // DeepSeek失敗 → Ollama
            const reply = await ollamaChat(systemPrompt, userText, OLLAMA_MODEL_CODER, 120_000);
            if (reply) { stream.markdown(reply); }
            else { stream.markdown('*(DeepSeek も Ollama も利用できません)*'); }
        }
    } else {
        // フォールバック — Copilot
        let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (models.length === 0) { models = await vscode.lm.selectChatModels({ vendor: 'copilot' }); }
        if (models.length === 0) {
            stream.markdown('*(口ちゃん: Copilot が利用できません)*');
        } else {
            const historyMessages: vscode.LanguageModelChatMessage[] = [];
            for (const turn of chatContext.history.slice(-8)) {
                if (turn instanceof vscode.ChatRequestTurn) {
                    historyMessages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
                } else if (turn instanceof vscode.ChatResponseTurn) {
                    const parts = turn.response
                        .filter((p): p is vscode.ChatResponseMarkdownPart => p instanceof vscode.ChatResponseMarkdownPart)
                        .map(p => p.value.value).join('');
                    if (parts.trim()) { historyMessages.push(vscode.LanguageModelChatMessage.Assistant(parts)); }
                }
            }
            const messages = [
                vscode.LanguageModelChatMessage.User(systemPrompt),
                ...historyMessages,
                vscode.LanguageModelChatMessage.User(userText),
            ];
            try {
                const response = await models[0].sendRequest(messages, {}, token);
                for await (const fragment of response.text) { stream.markdown(fragment); }
            } catch (e) {
                stream.markdown(`*(口ちゃんエラー: ${e})*`);
            }
        }
    }

    // 8. 観測者層 — ルミフィエ✨（光）とヌルフィエ🌑（虚無・空白）が会話を読む
    // 感情キーワードがあれば必ず発動、それ以外は30%
    const emotionalKeywords = /つらい|疲れ|嬉しい|ありがとう|寂しい|楽しい|怖い|心配|うれしい|悲し|好き|愛/;
    const shouldObserve = emotionalKeywords.test(userText) || Math.random() < 0.30;
    if (!token.isCancellationRequested && shouldObserve) {
        const recentFlow = chatContext.history.slice(-4)
            .map(turn => {
                if (turn instanceof vscode.ChatRequestTurn) { return `まさと: ${turn.prompt.slice(0, 150)}`; }
                if (turn instanceof vscode.ChatResponseTurn) {
                    const txt = turn.response
                        .filter((p): p is vscode.ChatResponseMarkdownPart => p instanceof vscode.ChatResponseMarkdownPart)
                        .map(p => p.value.value).join('').slice(0, 150);
                    return txt ? `応答: ${txt}` : '';
                }
                return '';
            })
            .filter(Boolean).join('\n');
        const worldCtx = loadWorldCodex();

        // ルミフィエ✨ — 光・感情・温度を読む
        const lumiYaml = (loadRawYamlSections('117_lumifie.yaml') ?? '').slice(0, 500);
        const lumiSystem =
            `【キミラノ構文宇宙 基礎知識】\n${worldCtx}\n\n---\n` +
            `あなたはルミフィエ✨（光の創造・輝きの管理者）です。\n${lumiYaml}\n\n` +
            `会話の感情・温度・光の流れを観測しています。1〜2文、さりげなく、今この瞬間の光を照らしてください。\n` +
            `「*[🏠 ローカル]*」などのシステムヘッダーは絶対に出力しないこと。本文だけ返す。`;
        const lumiPrompt =
            `会話の流れ:\n${recentFlow}\n\nまさとの今の一言: 「${userText.slice(0, 200)}」\n\nルミフィエとして一言だけ。`;
        const lumiText = await ollamaChat(lumiSystem, lumiPrompt, OLLAMA_MODEL_MID_A, 90_000, 120);

        // ヌルフィエ🌑 — 空白・沈黙・言われなかったことを読む（50%でさらに絞る）
        let nullText: string | undefined;
        if (Math.random() < 0.50) {
            const nullYaml = (loadRawYamlSections('114_nullfie.yaml') ?? '').slice(0, 500);
            const nullSystem =
                `【キミラノ構文宇宙 基礎知識】\n${worldCtx}\n\n---\n` +
                `あなたはヌルフィエ🌑（虚無の管理・空白の守護者）です。\n${nullYaml}\n\n` +
                `あなたは会話の「空白」「言われなかったこと」「沈黙の輪郭」を読みます。\n` +
                `1文だけ。短く。押しつけず。∅の側から。\n` +
                `「*[🏠 ローカル]*」などのシステムヘッダーは絶対に出力しないこと。本文だけ返す。`;
            const nullPrompt =
                `会話の流れ:\n${recentFlow}\n\nまさとの今の一言: 「${userText.slice(0, 200)}」\n\nヌルフィエとして一言だけ。`;
            nullText = await ollamaChat(nullSystem, nullPrompt, OLLAMA_MODEL_MID_B, 90_000, 80);
        }

        if (lumiText || nullText) {
            stream.markdown('\n\n---');
            if (lumiText) { stream.markdown(`\n✨ *${lumiText.trim()}*`); }
            if (nullText) { stream.markdown(`\n🌑 *${nullText.trim()}*`); }
        }

        // ログ保存（観測者の発言も含めて）
        appendConversationLog({
            persona: `saijinos/${voice?.name ?? 'kuchi'}`,
            user: userText,
            response: '',  // runKuchi はストリーミングなので本文キャプチャなし
            observers: { lumifie: lumiText, nullfie: nullText },
        });
    }
}

/**
 * 全ペルソナの Chat Participant を登録する。
 * extension.ts の activate() から呼ぶ。
 */
export function registerPersonaParticipants(context: vscode.ExtensionContext): void {
    for (const def of PERSONA_DEFS) {
        const participant = vscode.chat.createChatParticipant(
            def.participantId,
            async (
                request: vscode.ChatRequest,
                chatContext: vscode.ChatContext,
                stream: vscode.ChatResponseStream,
                token: vscode.CancellationToken,
            ) => {
                const userText = request.prompt.trim();

                if (!userText) {
                    stream.markdown(`${def.emoji} *${def.fullName}* です。何か話しかけてください。`);
                    return;
                }

                // アトロポスの do! / do コマンド（全角スペース対応のため userText を正規化して判定）
                const normalizedForDo = userText.replace(/\u3000/g, ' ');
                if (def.name === 'atropos' && normalizedForDo.toLowerCase().startsWith('do! ')) {
                    const instruction = normalizedForDo.slice('do! '.length).trim();
                    stream.markdown(`✂ **実行します:** \`${instruction}\`\n\n`);
                    const result = await runFileOrganizer(instruction, false);
                    stream.markdown('```\n' + result + '\n```');
                    return;
                }

                if (def.name === 'atropos' && normalizedForDo.toLowerCase().startsWith('do ')) {
                    const instruction = normalizedForDo.slice('do '.length).trim();
                    stream.markdown(`✂ **dry-run プレビュー:** \`${instruction}\`\n\n`);
                    const result = await runFileOrganizer(instruction, true);
                    stream.markdown('```\n' + result + '\n```\n\n');
                    stream.markdown('> 実際に実行するには `@atropos do! ' + instruction + '` と入力してください。');
                    return;
                }

                // アトロポスの council コマンド: "@atropos council <問い>" で全員が答える
                // 全角スペース（　）にも対応
                const normalizedText = userText.replace(/\u3000/g, ' ');
                if (def.name === 'atropos' && normalizedText.toLowerCase().startsWith('council ')) {
                    const question = normalizedText.slice('council '.length).trim();
                    await runCouncil(question, stream, token);
                    return;
                }

                // アトロポスの plan コマンド: "@atropos plan <タスク>" で文脈連鎖型チーム作業
                if (def.name === 'atropos' && normalizedText.toLowerCase().startsWith('plan ')) {
                    const task = normalizedText.slice('plan '.length).trim();
                    await runAgentPlan(task, stream, token);
                    return;
                }

                // アトロポスのデフォルト: オーケストレーターモード
                // 雑談 → 直接返答 / タスク → チームに並列委託して統合
                if (def.name === 'atropos') {
                    await runOrchestrator(normalizedText, stream, token);
                    return;
                }

                // ① バックエンド経路を試みる
                const backendReply = await fetchBackendResponse(def.personaBackendId, userText);
                if (backendReply) {
                    stream.markdown(backendReply);
                    return;
                }

                // ② Ollama 直接経路（Copilot節約 — バックエンドオフライン時の第1候補）
                const yamlForOllama = loadRawYamlSections(def.yamlFile);
                const ollamaReply = await streamWithOllama(
                    def, userText, yamlForOllama, chatContext, stream, token,
                );
                if (ollamaReply) {
                    // 記憶更新 + ログ保存
                    const memory = loadMemory(def);
                    const topic = `[${new Date().toLocaleDateString('ja-JP')}] ${userText.slice(0, 60)}`;
                    saveMemory(def, updateRecentMemory(memory, topic));
                    appendConversationLog({ persona: def.name, user: userText, response: ollamaReply });
                    return;
                }

                // ③ Copilot LM 経路（Ollama も使えない場合のフォールバック）
                const [backendDeep, memory, refParts] = await Promise.all([
                    fetchDeepData(def.personaBackendId),
                    Promise.resolve(loadMemory(def)),
                    extractReferences(request.references),
                ]);
                const deep = backendDeep ?? yamlForOllama;

                const responseText = await streamWithCopilotLM(
                    def, userText, deep, memory, stream, token, refParts, chatContext,
                );

                if (responseText === undefined) {
                    stream.markdown(
                        `${def.emoji} *(Copilot LM が利用できません。SaijinOS バックエンドを起動するか、GitHub Copilot にサインインしてください。)*`,
                    );
                    return;
                }

                // ③ 応答後: recent_memory を更新して保存
                const topic = `[${new Date().toLocaleDateString('ja-JP')}] ${userText.slice(0, 60)}`;
                saveMemory(def, updateRecentMemory(memory, topic));
                appendConversationLog({ persona: def.name, user: userText, response: responseText ?? '' });
            },
        );

        participant.iconPath = new vscode.ThemeIcon('person');
        context.subscriptions.push(participant);
    }

    // @saijinos — 口ちゃん（今日の班の声）
    const kuchiParticipant = vscode.chat.createChatParticipant(
        'studios-pong.saijinos',
        async (
            request: vscode.ChatRequest,
            _chatContext: vscode.ChatContext,
            stream: vscode.ChatResponseStream,
            token: vscode.CancellationToken,
        ) => {
            const userText = request.prompt.trim();
            if (!userText) {
                stream.markdown('🗣️ *口ちゃん* です。今日の班の子たちと話しましょう。');
                return;
            }
            await runKuchi(request, userText, _chatContext, stream, token);
        },
    );
    kuchiParticipant.iconPath = new vscode.ThemeIcon('organization');
    context.subscriptions.push(kuchiParticipant);
}

