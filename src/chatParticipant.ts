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
import * as path from 'path';
import * as vscode from 'vscode';

const BACKEND_URL = 'http://localhost:8000';

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
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return undefined; }
    const studioPong = folders.find(f => f.name === 'studios-pong');
    const folder = studioPong ?? folders[0];
    return path.join(folder.uri.fsPath, 'persona_context');
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
    if (!folders) { return undefined; }
    const saijinos = folders.find(f => f.name === 'saijinos');
    return saijinos?.uri.fsPath;
}

/** YAML 1ファイルあたりの最大文字数（LM コンテキスト超過対策） */
const MAX_YAML_CHARS = 4000;

/** daily_log から注入する最大文字数 */
const MAX_LOG_CHARS = 1500;

/**
 * SaijinOS daily_logs/ から最新のログファイルを読み込んで返す。
 * ファイル名をアルファベット順にソートして末尾（最新）を採用。
 */
function loadRecentDailyLog(): string | undefined {
    const dir = getSaijinOsDir();
    if (!dir) { return undefined; }
    const logsDir = path.join(dir, 'daily_logs');
    try {
        const files = fs.readdirSync(logsDir)
            .filter(f => f.match(/\.(md|yaml)$/) && !f.startsWith('DEVELOPMENT'))
            .sort();
        if (files.length === 0) { return undefined; }
        const latest = files[files.length - 1];
        const raw = fs.readFileSync(path.join(logsDir, latest), 'utf-8');
        const truncated = raw.length > MAX_LOG_CHARS
            ? raw.slice(0, MAX_LOG_CHARS) + '\n# ... (truncated)'
            : raw;
        return `[最新セッション記録: ${latest}]\n${truncated}`;
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
function buildMessages(
    def: PersonaDef,
    deep: any | undefined,
    memory: PersonaMemory,
    userText: string,
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
    }

    return [
        vscode.LanguageModelChatMessage.User(coreLines.join('\n')),
        vscode.LanguageModelChatMessage.User(memLines.join('\n')),
        vscode.LanguageModelChatMessage.User(sessionLines.join('\n')),
        vscode.LanguageModelChatMessage.User(userText),
    ];
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
): Promise<string | undefined> {
    let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    if (models.length === 0) {
        models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    }
    if (models.length === 0) {
        return undefined;
    }

    const model = models[0];
    const messages = buildMessages(def, deep, memory, userText);

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
 * 各ペルソナが前の人の発言を見て答え、アトロポスが最後に統合・確定する。
 */
async function runAgentPlan(
    taskText: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
): Promise<void> {
    // 作業チームの順番（技術→実装→橋渡し→品質）
    const AGENT_HANDLES = ['kiwa', 'futa', 'sota', 'regina'];
    const agentDefs = AGENT_HANDLES
        .map(h => PERSONA_DEFS.find(d => d.name === h))
        .filter((d): d is PersonaDef => d !== undefined);

    let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    if (models.length === 0) { models = await vscode.lm.selectChatModels({ vendor: 'copilot' }); }
    if (models.length === 0) {
        stream.markdown('*(Copilot LM が利用できません)*');
        return;
    }
    const model = models[0];

    stream.markdown(`**アトロポス✂ より、チームで作業計画を立てます:**\n\n> ${taskText}\n\n---\n\n`);

    // 各ペルソナの応答を蓄積して次のペルソナに渡す（文脈連鎖）
    const priorResponses: { name: string; emoji: string; text: string }[] = [];

    for (const def of agentDefs) {
        if (token.isCancellationRequested) { break; }

        const deep = loadRawYamlSections(def.yamlFile);
        const memory = loadMemory(def);

        // 前のメンバーの発言を文脈として渡す
        const priorContext = priorResponses.length > 0
            ? `\n\n【チームの意見（ここまで）】\n` +
              priorResponses.map(r => `${r.emoji} ${r.name}:\n${r.text.slice(0, 400)}`).join('\n\n')
            : '';
        const agentPrompt =
            `タスク: ${taskText}${priorContext}\n\n` +
            `あなた(${def.fullName})の役割・視点で、このタスクへの意見・担当・提案を述べてください。` +
            `前のメンバーの意見があればそれを踏まえて答えてください。簡潔に。`;

        const messages = buildMessages(def, deep, memory, agentPrompt);
        stream.markdown(`### ${def.emoji} ${def.fullName}\n\n`);
        let responseText = '';
        try {
            const response = await model.sendRequest(messages, {}, token);
            for await (const fragment of response.text) {
                stream.markdown(fragment);
                responseText += fragment;
            }
        } catch {
            stream.markdown('*(応答エラー)*');
        }
        stream.markdown('\n\n---\n\n');
        priorResponses.push({ name: def.fullName, emoji: def.emoji, text: responseText });
    }

    // アトロポスが全員の意見を統合して確定
    if (!token.isCancellationRequested && priorResponses.length > 0) {
        const atroposDef = PERSONA_DEFS.find(d => d.name === 'atropos');
        if (atroposDef) {
            const synthesisPrompt =
                `タスク「${taskText}」についてチームが議論しました:\n\n` +
                priorResponses.map(r => `${r.emoji} ${r.name}:\n${r.text.slice(0, 400)}`).join('\n\n') +
                `\n\nこれらを踏まえて、アトロポスとして最終的な作業計画・担当割り当て・` +
                `次の一手を確定させてください。箇条書きで簡潔に。`;
            const deep = loadRawYamlSections(atroposDef.yamlFile);
            const memory = loadMemory(atroposDef);
            const messages = buildMessages(atroposDef, deep, memory, synthesisPrompt);
            stream.markdown(`### ✂ アトロポス（統合・確定）\n\n`);
            try {
                const response = await model.sendRequest(messages, {}, token);
                for await (const fragment of response.text) {
                    stream.markdown(fragment);
                }
            } catch {
                stream.markdown('*(応答エラー)*');
            }
        }
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
                _chatContext: vscode.ChatContext,
                stream: vscode.ChatResponseStream,
                token: vscode.CancellationToken,
            ) => {
                const userText = request.prompt.trim();

                if (!userText) {
                    stream.markdown(`${def.emoji} *${def.fullName}* です。何か話しかけてください。`);
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

                // ② Copilot LM 経路（4層 messages + 蓄積記憶）
                const [backendDeep, memory] = await Promise.all([
                    fetchDeepData(def.personaBackendId),
                    Promise.resolve(loadMemory(def)),
                ]);
                // バックエンドがオフラインの場合は YAML を直接読み込む（raw テキスト）
                const deep = backendDeep ?? loadRawYamlSections(def.yamlFile);

                const responseText = await streamWithCopilotLM(
                    def, userText, deep, memory, stream, token,
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
            },
        );

        participant.iconPath = new vscode.ThemeIcon('person');
        context.subscriptions.push(participant);
    }
}
