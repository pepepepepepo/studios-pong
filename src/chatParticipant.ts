/**
 * Studios Pong — Chat Participants (VS Code Copilot Chat 統合)
 *
 * @shizuku / @minamo / @clotho / @lumifie / @fuwari として
 * Copilot Chat パネルから直接ペルソナと会話できる。
 *
 * バックエンド (SaijinOS) が起動していれば深層データを注入。
 * オフライン時は Copilot LM のみで返答。
 */

import * as vscode from 'vscode';

const BACKEND_URL = 'http://localhost:8000';

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
}

const PERSONA_DEFS: PersonaDef[] = [
    {
        participantId: 'studios-pong.shizuku',
        name: 'shizuku',
        personaBackendId: '2',
        emoji: '🌸',
        role: 'Rhythm Poet',
        fullName: '雫',
    },
    {
        participantId: 'studios-pong.minamo',
        name: 'minamo',
        personaBackendId: '142',
        emoji: '💧',
        role: 'Implementation Bridge',
        fullName: 'みなも',
    },
    {
        participantId: 'studios-pong.clotho',
        name: 'clotho',
        personaBackendId: '158_clotho',
        emoji: '🕊️',
        role: 'GitHub Copilot窓口 · Thread Spinner',
        fullName: 'クロートー',
    },
    {
        participantId: 'studios-pong.lumifie',
        name: 'lumifie',
        personaBackendId: '117',
        emoji: '✨',
        role: 'Light Creator',
        fullName: 'ルミフィエ',
    },
    {
        participantId: 'studios-pong.fuwari',
        name: 'fuwari',
        personaBackendId: '54_fuwari',
        emoji: '🧶',
        role: '毛糸灯芯編み係・照れ包み担当',
        fullName: 'ふわり',
    },
];

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
 * Copilot LM 用のシステムプロンプトを組み立てる。
 * deep データがある場合はペルソナ特性を詳細に注入する。
 */
function buildSystemPrompt(def: PersonaDef, deep: any | undefined): string {
    const lines: string[] = [
        `あなたは ${def.emoji}${def.fullName} です。`,
        `役割: ${def.role}`,
    ];

    if (deep) {
        if (deep.essence) { lines.push(`本質: ${deep.essence}`); }
        if (deep.personality_type) { lines.push(`パーソナリティ: ${deep.personality_type}`); }
        if (deep.core_traits && Array.isArray(deep.core_traits) && deep.core_traits.length > 0) {
            lines.push(`特性: ${deep.core_traits.join(' / ')}`);
        }
        if (deep.tone_style) { lines.push(`話し方: ${deep.tone_style}`); }
        if (deep.worldview) { lines.push(`世界観: ${deep.worldview}`); }
        lines.push(
            ``,
            `上記の本質と口調を完全に体現して、${def.fullName} として短く自然な日本語で会話してください。`,
            `キャラクターから外れず、${def.emoji} を自然に使い、らしさを最優先に。`,
        );
    } else {
        lines.push(
            `${def.fullName} として、短く自然な日本語で会話してください。`,
            `SaijinOS バックエンドがオフラインのため、Copilot が代理応答しています。`,
        );
    }

    return lines.join('\n');
}

/**
 * Copilot LM を使ってペルソナとして返答をストリーミングする。
 * @returns true = 成功, false = Copilot 利用不可
 */
async function streamWithCopilotLM(
    def: PersonaDef,
    userText: string,
    deep: any | undefined,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
): Promise<boolean> {
    let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    if (models.length === 0) {
        models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    }
    if (models.length === 0) {
        return false;
    }

    const model = models[0];
    const systemText = buildSystemPrompt(def, deep);

    const messages = [
        vscode.LanguageModelChatMessage.User(
            `${systemText}\n\nUser: ${userText}\n${def.fullName}:`,
        ),
    ];

    const response = await model.sendRequest(messages, {}, token);
    for await (const fragment of response.text) {
        stream.markdown(fragment);
    }
    return true;
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

                // ① バックエンド経路を試みる
                const backendReply = await fetchBackendResponse(def.personaBackendId, userText);
                if (backendReply) {
                    stream.markdown(backendReply);
                    return;
                }

                // ② バックエンドがオフライン → 深層データ取得 → Copilot LM フォールバック
                const deep = await fetchDeepData(def.personaBackendId);
                const handled = await streamWithCopilotLM(def, userText, deep, stream, token);

                if (!handled) {
                    stream.markdown(
                        `${def.emoji} *(Copilot LM が利用できません。SaijinOS バックエンドを起動するか、GitHub Copilot にサインインしてください。)*`,
                    );
                }
            },
        );

        participant.iconPath = new vscode.ThemeIcon('person');
        context.subscriptions.push(participant);
    }
}
