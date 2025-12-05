import * as vscode from 'vscode';
import * as path from 'path';
import { DatabaseManager, Snippet } from './db/sqliteService';
import { SnippetTreeProvider } from './providers/snippetTreeProvider';
import { SaveSnippetPanel } from './webview/saveSnippetPanel';

let treeProvider: SnippetTreeProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Snipboard extension is now active!');

    // Initialize database
    const db = DatabaseManager.getInstance();

    // Initialize tree view
    treeProvider = new SnippetTreeProvider();
    vscode.window.registerTreeDataProvider('snippetExplorer', treeProvider);

    // Register commands
    const saveSnippetCmd = vscode.commands.registerCommand('snipboard.saveSnippet', () =>
        handleSaveSnippet(context)
    );

    const searchSnippetCmd = vscode.commands.registerCommand('snipboard.searchSnippet', () =>
        handleSearchSnippet()
    );

    const insertSnippetCmd = vscode.commands.registerCommand(
        'snipboard.insertSnippet',
        async (item: any) => {
            // When called from context menu, item is the tree item
            if (item && item.snippet) {
                handleInsertSnippet(item.snippet);
            } else if (item && item.numId && item.type === 'snippet') {
                // Fetch snippet from DB if not available
                const db = DatabaseManager.getInstance();
                try {
                    const snippet = await db.getSnippetById(item.numId);
                    if (snippet) {
                        handleInsertSnippet(snippet);
                    }
                } catch (err) {
                    vscode.window.showErrorMessage(`Failed to insert snippet: ${err}`);
                }
            }
        }
    );

    const copySnippetCmd = vscode.commands.registerCommand(
        'snipboard.copySnippet',
        async (item: any) => {
            // When called from context menu, item is the tree item
            if (item && item.snippet) {
                handleCopySnippet(item.snippet);
            } else if (item && item.numId && item.type === 'snippet') {
                // Fetch snippet from DB if not available
                const db = DatabaseManager.getInstance();
                try {
                    const snippet = await db.getSnippetById(item.numId);
                    if (snippet) {
                        handleCopySnippet(snippet);
                    }
                } catch (err) {
                    vscode.window.showErrorMessage(`Failed to copy snippet: ${err}`);
                }
            }
        }
    );

    const refreshCmd = vscode.commands.registerCommand('snipboard.refreshExplorer', () => {
        treeProvider.refresh();
    });

    context.subscriptions.push(
        saveSnippetCmd,
        searchSnippetCmd,
        insertSnippetCmd,
        copySnippetCmd,
        refreshCmd
    );
}

export function deactivate() {
    DatabaseManager.getInstance().close();
}

function getFileExtension(editor: vscode.TextEditor): string {
    const fileName = editor.document.fileName;
    const ext = path.extname(fileName).replace('.', '');
    return ext || 'txt';
}

async function handleSaveSnippet(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor. Please open a file first.');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    const language = getFileExtension(editor);

    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to save.');
        return;
    }

    SaveSnippetPanel.createOrShow(context.extensionUri, selectedText, language, treeProvider);
}

async function handleSearchSnippet() {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor. Please open a file first.');
        return;
    }

    const language = getFileExtension(editor);
    const db = DatabaseManager.getInstance();

    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Search snippets...';
    quickPick.busy = false;

    let debounceTimer: NodeJS.Timeout;

    quickPick.onDidChangeValue(async (query) => {
        clearTimeout(debounceTimer);

        if (!query.trim()) {
            quickPick.items = [];
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const snippets = await db.searchSnippets(query, language);
                quickPick.items = snippets.map((snippet) => ({
                    label: snippet.name,
                    description: snippet.description,
                    detail: `${snippet.language} • Copied ${snippet.timesCopied} times`,
                    snippet,
                }));
            } catch (error) {
                vscode.window.showErrorMessage(`Search failed: ${error}`);
            }
        }, 300);
    });

    quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0] as any;
        if (selected && selected.snippet) {
            handleInsertSnippet(selected.snippet);
        }
        quickPick.dispose();
    });

    quickPick.onDidHide(() => quickPick.dispose());

    quickPick.show();
}

function handleInsertSnippet(snippet: Snippet) {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showErrorMessage('No active editor. Please open a file first.');
        return;
    }

    const db = DatabaseManager.getInstance();

    editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.active, snippet.contents);
    });

    db.incrementTimesCopied(snippet.id).catch((err) => {
        console.error('Error incrementing stats:', err);
    });
    treeProvider.refresh();

    vscode.window.showInformationMessage(`✓ Inserted "${snippet.name}"`);
}

function handleCopySnippet(snippet: Snippet) {
    const db = DatabaseManager.getInstance();

    vscode.env.clipboard.writeText(snippet.contents);
    db.incrementTimesCopied(snippet.id).catch((err) => {
        console.error('Error incrementing stats:', err);
    });
    treeProvider.refresh();

    vscode.window.showInformationMessage(`✓ Copied "${snippet.name}" to clipboard`);
}