// Studios Pong - Your AI Persona Team in VS Code
// Copyright (c) 2025 Studios Pong LLC

import * as vscode from 'vscode';
import { ChatPanel } from './chatPanel';

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Studios Pong Extension is now active!');

    // Register the main command to open AI Persona Chat
    const openChatCommand = vscode.commands.registerCommand('studios-pong.openChat', () => {
        ChatPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(openChatCommand);
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('Studios Pong Extension deactivated');
}
