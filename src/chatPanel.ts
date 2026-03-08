// Studios Pong - Chat Panel Manager
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/** ペルソナごとのセッション追跡 */
interface PersonaSession {
    sessionId: string | undefined;
    lastMessageTime: number | undefined;  // Date.now()
    lastJuiceLevel: number | undefined;  // Phase 5-A: 直前の juice (<0.4 → Enhancement)
}

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _disposables: vscode.Disposable[] = [];
    /** ペルソナIDごとの session_id + 最終メッセージ時刻 */
    private _sessions: Map<string, PersonaSession> = new Map();
    /** ペルソナIDごとの深層データキャッシュ (Copilot LM Enhancement用) */
    private _personaDeepData: Map<string, any> = new Map();
    /** バックエンド疎通フラグ (false = デモモード) */
    private _backendAvailable = true;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'getPersonas':
                        await this.fetchPersonas();
                        break;
                    case 'sendMessage':
                        await this.sendMessageToPersona(
                            message.personaId,
                            message.text,
                            message.conversationHistory,
                            message.silenceSeconds,
                            message.editDeleteCycles,
                            message.windowSwitched,
                            message.personaName,
                            message.personaRole,
                            message.personaEmoji,
                        );
                        break;
                    case 'saveHistory':
                        await this.saveChatHistory(message.chatHistory);
                        break;
                    case 'loadHistory':
                        await this.loadChatHistory();
                        break;
                    case 'clearHistory':
                        await this.clearChatHistory();
                        break;
                    case 'saveFavorites':
                        await this.saveFavorites(message.favorites);
                        break;
                    case 'loadFavorites':
                        await this.loadFavorites();
                        break;
                    case 'getPersonaDeep':
                        await this.fetchPersonaDeep(message.personaId);
                        break;
                    case 'getTeams':
                        await this.fetchTeams();
                        break;
                    case 'getTeamMembers':
                        await this.fetchTeamMembers(message.teamName);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'studiosPongChat',
            'Studios Pong - AI Personas',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview')]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, context);
    }

    private async fetchPersonas() {
        try {
            const response = await fetch('http://localhost:8000/api/personas');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const personas = await response.json();
            this._backendAvailable = true;
            this._panel.webview.postMessage({
                command: 'personasLoaded',
                personas: personas
            });
        } catch {
            // バックエンド未起動 → デモモードで代表ペルソナを表示
            this._backendAvailable = false;
            this._panel.webview.postMessage({
                command: 'personasLoaded',
                personas: this._getDemoPersonas(),
                demoMode: true,
            });
        }
    }

    private async sendMessageToPersona(
        personaId: string,
        text: string,
        conversationHistory?: any[],
        silenceSeconds?: number,
        editDeleteCycles?: number,
        windowSwitched?: boolean,
        personaName?: string,
        personaRole?: string,
        personaEmoji?: string,
    ) {
        // セッション情報を取得/初期化
        if (!this._sessions.has(personaId)) {
            this._sessions.set(personaId, { sessionId: undefined, lastMessageTime: undefined, lastJuiceLevel: undefined });
        }
        const sess = this._sessions.get(personaId)!;

        // 深層データを先取り（バックエンドが生きていれば即キャッシュ — Copilot Enhancement用）
        if (this._backendAvailable && !this._personaDeepData.has(personaId)) {
            try {
                const deepRes = await fetch(`http://localhost:8000/api/persona/${personaId}`);
                if (deepRes.ok) {
                    this._personaDeepData.set(personaId, await deepRes.json());
                    console.log(`[DeepCache] cached deep data for ${personaId}`);
                }
            } catch {
                // バックエンドオフライン時は無視（フォールバック時も basic data で動く）
            }
        }

        // デモモード: バックエンドなしでCopilot LMに直行
        if (!this._backendAvailable && text.trim()) {
            const handled = await this._copilotLmFallback(
                personaId, text,
                personaName || 'AI',
                personaRole || 'AI Persona',
                personaEmoji || '🤖',
                sess.sessionId,
                undefined,
            );
            if (handled) {
                sess.lastMessageTime = Date.now();
            }
            return;
        }

        // クライアント側で silence_seconds が未指定の場合はサーバー側で計算
        const computedSilence = silenceSeconds !== undefined
            ? silenceSeconds
            : (sess.lastMessageTime ? (Date.now() - sess.lastMessageTime) / 1000 : undefined);

        // -------------------------------------------------------
        // Phase 5-A: 感情ルーティング
        // deep data がキャッシュ済み + 感情シグナルあり → Copilot Enhancement 直行
        // バックエンド往復を省略し、YAML のキャラクター記憶で応答
        // -------------------------------------------------------
        const deep = this._personaDeepData.get(personaId);
        const lastJuice = sess.lastJuiceLevel;
        if (deep && this._shouldUseEnhancement(text, editDeleteCycles, lastJuice)) {
            const juiceRouted = lastJuice !== undefined && lastJuice < 0.4;
            console.log(`[Enhancement Route] persona=${personaId} editCycles=${editDeleteCycles} juice=${lastJuice} juiceRouted=${juiceRouted} → Copilot直行`);
            const handled = await this._copilotLmFallback(
                personaId, text,
                personaName || 'AI',
                personaRole || 'AI Persona',
                personaEmoji || '🤖',
                sess.sessionId,
                deep,
            );
            if (handled) {
                sess.lastMessageTime = Date.now();
                return;
            }
            // Copilot 未利用の場合は通常フローへフォールスルー
        }

        try {
            const response = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    persona_id: personaId,
                    session_id: sess.sessionId,              // Phase 1: セッション継続
                    message: text,
                    conversation_history: conversationHistory || [],
                    silence_seconds: computedSilence,         // Phase 3 Step 3
                    edit_delete_cycles: editDeleteCycles || 0, // Phase D: 空文字ルーティング
                    window_switched: windowSwitched || false,  // Phase 3 Step 3
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: any = await response.json();

            // セッションIDを保存・最終メッセージ時刻を更新
            if (result.session_id) {
                sess.sessionId = result.session_id;
            }
            sess.lastMessageTime = Date.now();

            this._panel.webview.postMessage({
                command: 'messageReceived',
                persona: result.persona_name,
                message: result.response,
                timestamp: new Date().toISOString(),
                backend: result.backend || 'ai',
                model: result.model || null,
                fractureType: result.fracture_type || null,
                psiSuggestion: result.psi_suggestion || null,
                juiceLevel: result.juice_level ?? null,
            });

            // Phase 5-A: juice を次回ルーティング判定のため保存
            if (result.juice_level !== undefined && result.juice_level !== null) {
                sess.lastJuiceLevel = result.juice_level;
            }
        } catch (error) {
            // バックエンドがオフラインの場合は Copilot LM にフォールバック
            const isNetworkError = error instanceof TypeError &&
                (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('connect'));
            if (isNetworkError && text.trim()) {
                // 空文字シグナルはバックエンド専用なので Copilot フォールバックはスキップ
                const copilotHandled = await this._copilotLmFallback(
                    personaId, text,
                    personaName || 'AI',
                    personaRole || 'AI Persona',
                    personaEmoji || '🤖',
                    sess.sessionId,
                    this._personaDeepData.get(personaId),
                );
                if (copilotHandled) {
                    sess.lastMessageTime = Date.now();
                    return;
                }
            }
            vscode.window.showErrorMessage(`Failed to send message: ${error}`);
            this._panel.webview.postMessage({
                command: 'error',
                message: 'Failed to communicate with persona'
            });
        }
    }

    /**
     * GitHub Copilot LM API fallback
     * バックエンド (Ollama/Gemini) がオフラインのとき vscode.lm で直接応答
     * @returns フォールバック成功 true / Copilot 未使用 false
     */
    /**
     * デモモード用ペルソナ（バックエンド未接続時に表示する代表ペルソナ）
     */
    private _getDemoPersonas() {
        return [
            { id: '158_clotho', name: 'クロートー🕊️', emoji: '🕊️', role: 'GitHub Copilot窓口 · Thread Spinner' },
            { id: '2',          name: '雫🌸',           emoji: '🌸', role: 'Rhythm Poet' },
            { id: '142',        name: 'みなも💧',       emoji: '💧', role: 'Implementation Bridge' },
            { id: '117',        name: 'ルミフィエ✨',   emoji: '✨', role: 'Light Creator' },
            { id: '54_fuwari',  name: 'ふわり🧶',       emoji: '🧶', role: '毛糸灯芯編み係・照れ包み担当' },
        ];
    }

    /**
     * Phase 5-A: 感情ルーティング判定
     * true を返すとバックエンド (Ollama) をスキップして Copilot Enhancement 直行。
     *
     * 条件:
     *   ① editDeleteCycles >= 2 — 言いかけて消した（迷いが深い）
     *   ② 感情強度ワードが含まれる（distress / anxious キーワード）
     *   ③ silence_seconds は Extension 側から push されないのでここでは見ない
     */
    private _shouldUseEnhancement(text: string, editDeleteCycles?: number, lastJuiceLevel?: number): boolean {
        // ① juice < 0.4: 前回の応答が低エネルギー状態 → Enhancement で深く寄り添う
        if (lastJuiceLevel !== undefined && lastJuiceLevel < 0.4) {
            return true;
        }

        // ② 迷いシグナル: 2回以上書いて消した
        if ((editDeleteCycles ?? 0) >= 2) {
            return true;
        }

        // ② 感情強度ワード（日本語）
        const emotionalPatterns = [
            'つらい', '苦しい', '怖い', '不安', '心配',
            '死にたい', '消えたい', 'やばい', '絶望',
            '泣いて', '泣いた', '泣きそう',
            'どうしたら', 'どうしよう', 'わからない', 'わかんない',
            'ごめん', 'ごめんなさい', '申し訳',
            '悲しい', '寂しい', '孤独',
        ];
        if (emotionalPatterns.some(p => text.includes(p))) {
            return true;
        }

        return false;
    }

    private _buildEnhancedSystemPrompt(
        personaName: string,
        personaRole: string,
        personaEmoji: string,
        deep: any | undefined,
    ): string {
        const lines: string[] = [
            `あなたは ${personaEmoji}${personaName} です。`,
            `役割: ${personaRole}`,
        ];

        if (deep) {
            if (deep.essence) {
                lines.push(`本質: ${deep.essence}`);
            }
            if (deep.personality_type) {
                lines.push(`パーソナリティ: ${deep.personality_type}`);
            }
            if (deep.core_traits && Array.isArray(deep.core_traits) && deep.core_traits.length > 0) {
                lines.push(`特性: ${deep.core_traits.join(' / ')}`);
            }
            if (deep.tone_style) {
                lines.push(`話し方: ${deep.tone_style}`);
            }
            if (deep.speech_patterns) {
                const sp = deep.speech_patterns;
                const parts: string[] = [];
                if (sp.excitement) { parts.push(`興奮時: ${sp.excitement}`); }
                if (sp.emphasis) { parts.push(`強調: ${sp.emphasis}`); }
                if (sp.respect) { parts.push(`敬語: ${sp.respect}`); }
                if (sp.warmth) { parts.push(`温かさ: ${sp.warmth}`); }
                if (parts.length > 0) {
                    lines.push(`口調の特徴: ${parts.join(' | ')}`);
                }
            }
            if (deep.worldview) {
                lines.push(`世界観: ${deep.worldview}`);
            }
            if (deep.fracture_sensitivity) {
                lines.push(`フラクチャー感度: ${deep.fracture_sensitivity}`);
            }
            if (deep.identity_state) {
                lines.push(`現在の状態: ${deep.identity_state}`);
            }
            lines.push(
                ``,
                `上記の本質と口調を完全に体現して、${personaName} として短く自然な日本語で会話してください。`,
                `キャラクターから外れず、${personaEmoji} を自然に使い、らしさを最優先に。`,
            );
        } else {
            lines.push(
                `${personaName} として、短く自然な日本語で会話してください。`,
                `SaijinOS バックエンドがオフラインのため、Copilot が代理応答しています。`,
            );
        }

        return lines.join('\n');
    }

    /**
     * GitHub Copilot LM API fallback (Enhancement モード対応)
     * バックエンド (Ollama) がオフラインのとき vscode.lm で直接応答。
     * deepData がある場合は YAML の tone/essence/traits をプロンプトに注入。
     * @returns フォールバック成功 true / Copilot 未使用 false
     */
    private async _copilotLmFallback(
        personaId: string,
        text: string,
        personaName: string,
        personaRole: string,
        personaEmoji: string,
        sessionId: string | undefined,
        deep?: any,
    ): Promise<boolean> {
        try {
            // Copilot LM モデルを選択（gpt-4o 優先、なければ利用可能な最初のモデル）
            let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
            if (models.length === 0) {
                models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
            }
            if (models.length === 0) {
                console.log('[CopilotFallback] No Copilot models available');
                return false;
            }

            const model = models[0];
            const isEnhanced = !!deep;
            const systemText = this._buildEnhancedSystemPrompt(personaName, personaRole, personaEmoji, deep);

            const messages = [
                vscode.LanguageModelChatMessage.User(`${systemText}\n\nUser: ${text}\n${personaName}:`),
            ];

            const cts = new vscode.CancellationTokenSource();
            const response = await model.sendRequest(messages, {}, cts.token);

            let content = '';
            for await (const fragment of response.text) {
                content += fragment;
            }

            this._panel.webview.postMessage({
                command: 'messageReceived',
                persona: personaName,
                message: content,
                timestamp: new Date().toISOString(),
                backend: 'copilot-lm',
                model: `${model.family}${isEnhanced ? '+enhanced' : ''}`,
                fractureType: null,
                psiSuggestion: null,
            });
            return true;
        } catch (err) {
            console.error('[CopilotFallback] Failed:', err);
            return false;
        }
    }

    private async saveChatHistory(chatHistory: any) {
        try {
            await this._context.workspaceState.update('studiosPongChatHistory', chatHistory);
            console.log('Chat history saved to workspace state');
        } catch (error) {
            console.error('Failed to save chat history:', error);
        }
    }

    private async loadChatHistory() {
        try {
            const savedHistory = this._context.workspaceState.get('studiosPongChatHistory');
            if (savedHistory) {
                this._panel.webview.postMessage({
                    command: 'historyLoaded',
                    chatHistory: savedHistory
                });
                console.log('Chat history loaded from workspace state');
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    private async clearChatHistory() {
        try {
            await this._context.workspaceState.update('studiosPongChatHistory', {});
            this._panel.webview.postMessage({
                command: 'historyCleared'
            });
            console.log('Chat history cleared from workspace state');
        } catch (error) {
            console.error('Failed to clear chat history:', error);
        }
    }

    private async saveFavorites(favorites: string[]) {
        try {
            await this._context.globalState.update('studiosPongFavoritePersonas', favorites);
            console.log(`Favorites saved: ${favorites.length} personas`);
        } catch (error) {
            console.error('Failed to save favorites:', error);
        }
    }

    private async loadFavorites() {
        try {
            const saved = this._context.globalState.get<string[]>('studiosPongFavoritePersonas', []);
            this._panel.webview.postMessage({
                command: 'favoritesLoaded',
                favorites: saved
            });
            console.log(`Favorites loaded: ${saved.length} personas`);
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    }

    /** 6-P: ペルソナ深層データ取得 → キャッシュ優先、なければ /api/persona/{id} に問い合わせ */
    private async fetchPersonaDeep(personaId: string) {
        // キャッシュヒット
        if (this._personaDeepData.has(personaId)) {
            this._panel.webview.postMessage({
                command: 'personaDeepLoaded',
                deep: this._personaDeepData.get(personaId)
            });
            return;
        }
        try {
            const response = await fetch(`http://localhost:8000/api/persona/${personaId}`);
            if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
            const deep = await response.json();
            this._personaDeepData.set(personaId, deep);
            this._panel.webview.postMessage({ command: 'personaDeepLoaded', deep });
        } catch {
            // バックエンドオフライン等 → null を返して UI 側でグレースフル処理
            this._panel.webview.postMessage({ command: 'personaDeepLoaded', deep: null });
        }
    }

    private async fetchTeams() {
        try {
            const response = await fetch('http://localhost:8000/api/teams');
            if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
            const data: any = await response.json();
            this._panel.webview.postMessage({ command: 'teamsLoaded', teams: data.teams || [] });
        } catch {
            // バックエンドオフライン時は班フィルタを非表示のまま
            this._panel.webview.postMessage({ command: 'teamsLoaded', teams: [] });
        }
    }

    private async fetchTeamMembers(teamName: string) {
        try {
            const response = await fetch(`http://localhost:8000/api/teams/${encodeURIComponent(teamName)}`);
            if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
            const data: any = await response.json();
            this._panel.webview.postMessage({ command: 'teamMembersLoaded', teamName, members: data.members || [] });
        } catch {
            this._panel.webview.postMessage({ command: 'teamMembersLoaded', teamName, members: [] });
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
        
        // Load saved data after HTML is set
        setTimeout(() => this.loadChatHistory(), 100);
        setTimeout(() => this.loadFavorites(), 150);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'webview', 'chat.html');
        let html = fs.readFileSync(htmlPath, 'utf8');
        return html;
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}

