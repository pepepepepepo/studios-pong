// Studios Pong - Chat Panel Manager
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

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
                        await this.sendMessageToPersona(message.personaId, message.text, message.conversationHistory);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
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
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }

    private async fetchPersonas() {
        try {
            const response = await fetch('http://localhost:8000/api/personas');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const personas = await response.json();
            
            this._panel.webview.postMessage({
                command: 'personasLoaded',
                personas: personas
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch personas: ${error}`);
            this._panel.webview.postMessage({
                command: 'error',
                message: 'Cannot connect to SaijinOS backend. Please ensure FastAPI is running on localhost:8000'
            });
        }
    }

    private async sendMessageToPersona(personaId: number, text: string, conversationHistory?: any[]) {
        try {
            const response = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    persona_id: personaId,
                    message: text,
                    conversation_history: conversationHistory || []
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: any = await response.json();
            
            this._panel.webview.postMessage({
                command: 'messageReceived',
                persona: result.persona_name,
                message: result.response,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to send message: ${error}`);
            this._panel.webview.postMessage({
                command: 'error',
                message: 'Failed to communicate with persona'
            });
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'chat.html');
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

