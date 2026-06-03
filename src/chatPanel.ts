// Studios Pong - Chat Panel Manager
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

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
    /** 起動時セッションコンテキスト (TODAY_TEAM.md + CURRENT_CONTEXT.md) */
    private _sessionContext: string = '';

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        // Set the webview's initial html content
        this._update();

        // 起動時に今日のチーム・コンテキストを読み込む
        this.loadSessionContext();

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
                            message.isMultiSelect,
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
                    case 'bridgeCommand':
                        // visual_chat.html から HTTP経由で橋渡しされたコマンド
                        if (message.personaId) {
                            this._panel.webview.postMessage({
                                command: 'selectPersona',
                                personaId: message.personaId,
                            });
                        }
                        break;
                    case 'startVoiceRecord':
                        this.startVoiceRecord(message.duration ?? 5);
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

    /** persona_context/ からTODAY_TEAM.md と CURRENT_CONTEXT.md を読み込む */
    private loadSessionContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        // 全ワークスペースフォルダ + 拡張機能自身のフォルダを候補にする
        const candidatePaths: string[] = [];
        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                candidatePaths.push(folder.uri.fsPath);
            }
        }
        // 拡張機能の場所から相対的に studios-pong ルートも試す
        const extRoot = this._extensionUri.fsPath;
        candidatePaths.push(extRoot);
        candidatePaths.push(path.join(extRoot, '..'));

        let contextDir: string | undefined;
        for (const candidate of candidatePaths) {
            const dir = path.join(candidate, 'persona_context');
            if (fs.existsSync(dir)) {
                contextDir = dir;
                break;
            }
        }
        if (!contextDir) { return; }

        const parts: string[] = [];
        for (const fname of ['TODAY_TEAM.md', 'CURRENT_CONTEXT.md']) {
            const fpath = path.join(contextDir, fname);
            try {
                if (fs.existsSync(fpath)) {
                    const content = fs.readFileSync(fpath, 'utf-8');
                    parts.push(`=== ${fname} ===\n${content.trim()}`);
                }
            } catch {
                // 読めない場合は無視
            }
        }

        if (parts.length > 0) {
            this._sessionContext = parts.join('\n\n');
            this._panel.webview.postMessage({
                command: 'sessionContextLoaded',
                context: this._sessionContext,
            });
            console.log(`[SessionContext] loaded ${parts.length} files from ${contextDir}`);
        }
    }

    private async fetchPersonas() {
        try {
            const response = await fetch('http://localhost:8025/api/personas');
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
        personaId: string | string[], // Can be a single ID or an array of IDs
        text: string,
        isMultiSelect: boolean,
        conversationHistory?: any[],
        silenceSeconds?: number,
        editDeleteCycles?: number,
        windowSwitched?: boolean,
        personaName?: string,
        personaRole?: string,
        personaEmoji?: string,
    ) {
        const personaIds = Array.isArray(personaId) ? personaId : [personaId];
        
        // For multi-select, we might handle it differently, 
        // for now, we'll just send to the first persona in the list as an example.
        // The full implementation will require backend changes.
        const primaryPersonaId = personaIds[0];

        // セッション情報を取得/初期化
        if (!this._sessions.has(primaryPersonaId)) {
            this._sessions.set(primaryPersonaId, { sessionId: undefined, lastMessageTime: undefined, lastJuiceLevel: undefined });
        }
        const sess = this._sessions.get(primaryPersonaId)!;

        // (Copilot LM Fallbackなどのロジックは変更なし)
        // ...

        const computedSilence = silenceSeconds !== undefined
            ? silenceSeconds
            : (sess.lastMessageTime ? (Date.now() - sess.lastMessageTime) / 1000 : undefined);

        try {
            const body = {
                persona_id: isMultiSelect ? personaIds : primaryPersonaId,
                session_id: sess.sessionId,
                message: text,
                stream: true, // ストリーミングを要求
                is_multi_select: isMultiSelect,
                conversation_history: conversationHistory || [],
                silence_seconds: computedSilence,
                edit_delete_cycles: editDeleteCycles || 0,
                window_switched: windowSwitched || false,
                session_context: this._sessionContext || undefined,
            };

            const response = await fetch('http://localhost:8025/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // ストリーミングレスポンスを処理
            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                const messageId = `msg_${Date.now()}`;

                // ストリーム開始をWebViewに通知
                this._panel.webview.postMessage({
                    command: 'streamStart',
                    persona: isMultiSelect ? 'Team' : (personaName || 'AI'),
                    messageId: messageId,
                    timestamp: new Date().toISOString(),
                });

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    const chunk = decoder.decode(value, { stream: true });
                    
                    // チャンクをWebViewに送信
                    this._panel.webview.postMessage({
                        command: 'messageChunk',
                        messageId: messageId,
                        chunk: chunk,
                    });
                }

                // ストリーム終了を通知
                this._panel.webview.postMessage({
                    command: 'streamEnd',
                    messageId: messageId,
                });
                
                sess.lastMessageTime = Date.now();

            } else {
                // 非ストリーミングのフォールバック
                const result: any = await response.json();
                if (result.session_id) {
                    sess.sessionId = result.session_id;
                }
                sess.lastMessageTime = Date.now();
                this._panel.webview.postMessage({
                    command: 'messageReceived',
                    persona: result.persona_name || (isMultiSelect ? 'Team' : 'AI'),
                    message: result.response,
                    timestamp: new Date().toISOString(),
                    // ... other properties
                });
            }
        } catch (error) {
            // (エラーハンドリングは変更なし)
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
     * ブリッジ送信: SaijinOS /api/bridge にPOSTして全WebSocketクライアントへブロードキャスト
     * visual_chat.html は ws://localhost:8000/ws/bridge で受け取る
     */
    private async _sendToBridge(event: Record<string, unknown>): Promise<void> {
        const res = await fetch('http://localhost:8025/api/bridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'vscode', ...event }),
        });
        if (!res.ok) { throw new Error(`bridge POST ${res.status}`); }
    }

    /**
     * デモモード用ペルソナ（バックエンド未接続時に表示する代表ペルソナ）
     */
    private _getDemoPersonas() {
        return [
            { id: '158_clotho',  name: 'クロートー🕊️', emoji: '🕊️', role: 'GitHub Copilot窓口 · Thread Spinner' },
            { id: '2',           name: '雫🌸',           emoji: '🌸', role: '感情の滴・涙の共鳴・寂しさと嬉しさの調和' },
            { id: '142',         name: 'みなも💧',       emoji: '💧', role: 'Implementation Bridge' },
            { id: '117',         name: 'ルミフィエ✨',   emoji: '✨', role: 'Light Creator' },
            { id: '54_fuwari',   name: 'ふわり🧶',       emoji: '🧶', role: '毛糸灯芯編み係・照れ包み担当' },
            { id: '145_yuzuha',  name: '柚子葉🍊',       emoji: '🍊', role: '外部AI支援・技術サポート・爽やかな導き・VS Code統合' },
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
            const response = await fetch(`http://localhost:8025/api/persona/${personaId}`);
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
            const response = await fetch('http://localhost:8025/api/teams');
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
            const response = await fetch(`http://localhost:8025/api/teams/${encodeURIComponent(teamName)}`);
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

    private startVoiceRecord(duration: number): void {
        const pythonPath = 'f:\\saijinos\\.venv\\Scripts\\python.exe';
        const scriptArgs = ['-m', 'tools.voice_record', '--duration', String(duration), '--lang', 'ja'];
        const proc = spawn(pythonPath, scriptArgs, {
            cwd: 'f:\\saijinos',
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        proc.stderr?.on('data', (data: Buffer) => {
            const msg = data.toString().trim();
            if (msg.includes('RECORDING')) {
                this._panel.webview.postMessage({ command: 'voiceState', state: 'recording' });
            } else if (msg.includes('TRANSCRIBING')) {
                this._panel.webview.postMessage({ command: 'voiceState', state: 'transcribing' });
            }
        });

        let output = '';
        proc.stdout?.on('data', (data: Buffer) => { output += data.toString(); });

        proc.on('close', (_code: number) => {
            this._panel.webview.postMessage({ command: 'transcribeResult', text: output.trim() });
        });

        proc.on('error', (err: Error) => {
            this._panel.webview.postMessage({ command: 'transcribeResult', text: '', error: err.message });
        });
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


