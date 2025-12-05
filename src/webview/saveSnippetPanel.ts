import * as vscode from 'vscode';
import { DatabaseManager, Tag } from '../db/sqliteService';
import { SnippetTreeProvider } from '../providers/snippetTreeProvider';

export class SaveSnippetPanel {
    public static readonly viewType = 'saveSnippetPanel';
    public static currentPanel: SaveSnippetPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private db: DatabaseManager;
    private treeProvider: SnippetTreeProvider;

    public static createOrShow(
        extensionUri: vscode.Uri,
        selectedText: string,
        language: string,
        treeProvider: SnippetTreeProvider
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (SaveSnippetPanel.currentPanel) {
            SaveSnippetPanel.currentPanel._panel.reveal(column);
            SaveSnippetPanel.currentPanel.refresh(selectedText, language);
        } else {
            SaveSnippetPanel.currentPanel = new SaveSnippetPanel(
                extensionUri,
                column || vscode.ViewColumn.One,
                selectedText,
                language,
                treeProvider
            );
        }
    }

    private constructor(
        extensionUri: vscode.Uri,
        column: vscode.ViewColumn,
        selectedText: string,
        language: string,
        treeProvider: SnippetTreeProvider
    ) {
        this._extensionUri = extensionUri;
        this.db = DatabaseManager.getInstance();
        this.treeProvider = treeProvider;

        this._panel = vscode.window.createWebviewPanel(
            SaveSnippetPanel.viewType,
            'Save Snippet',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        // Load HTML asynchronously
        this.initializeHtml(selectedText, language);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage((message) => this.handleMessage(message), null, this._disposables);
    }

    private async initializeHtml(selectedText: string, language: string) {
        this._panel.webview.html = await this.getHtmlForWebview(selectedText, language);
    }

    private async refresh(selectedText: string, language: string) {
        this._panel.webview.html = await this.getHtmlForWebview(selectedText, language);
    }

    private async getHtmlForWebview(selectedText: string, language: string): Promise<string> {
        const tags = await this.db.getTags();
        const tagCheckboxes = tags
            .map(
                (tag) =>
                    `<label style="display: block; margin: 4px 0;">
                <input type="checkbox" name="tags" value="${tag.id}" data-tag-name="${tag.name}">
                ${this.escapeHtml(tag.name)}
            </label>`
            )
            .join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Save Snippet</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
        }

        h1 {
            font-size: 20px;
            margin-bottom: 20px;
            color: var(--vscode-foreground);
        }

        .form-group {
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
        }

        label {
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 6px;
            color: var(--vscode-foreground);
        }

        input[type="text"],
        textarea,
        .tags-container {
            padding: 8px 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: 'Courier New', monospace;
            font-size: 12px;
            border-radius: 2px;
        }

        textarea {
            min-height: 120px;
            resize: vertical;
            font-family: 'Courier New', monospace;
        }

        .tags-container {
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            padding: 10px;
            max-height: 150px;
            overflow-y: auto;
        }

        .tags-container label {
            margin: 4px 0;
            font-weight: normal;
        }

        .tags-container input[type="checkbox"] {
            margin-right: 6px;
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        button {
            flex: 1;
            padding: 10px 16px;
            border: 1px solid var(--vscode-button-border, transparent);
            border-radius: 2px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        #saveBtn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        #saveBtn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        #cancelBtn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        #cancelBtn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .error {
            color: var(--vscode-errorForeground);
            font-size: 12px;
            margin-top: 4px;
            display: none;
        }

        .error.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Save Code Snippet</h1>

        <div class="form-group">
            <label for="name">Snippet Name *</label>
            <input type="text" id="name" placeholder="e.g., Quick Sort Algorithm" required>
            <div class="error" id="nameError">Name is required</div>
        </div>

        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" placeholder="Optional description of this snippet..."></textarea>
        </div>

        <div class="form-group">
            <label for="language">Language</label>
            <input type="text" id="language" value="${this.escapeHtml(language)}" readonly>
        </div>

        <div class="form-group">
            <label for="code">Code *</label>
            <textarea id="code" required>${this.escapeHtml(selectedText)}</textarea>
            <div class="error" id="codeError">Code is required</div>
        </div>

        <div class="form-group">
            <label>Tags</label>
            <div class="tags-container">
                ${tagCheckboxes || '<p style="color: var(--vscode-descriptionForeground); font-size: 12px;">No tags available</p>'}
            </div>
        </div>

        <div class="button-group">
            <button id="saveBtn">Save Snippet</button>
            <button id="cancelBtn">Cancel</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('saveBtn').addEventListener('click', () => {
            const name = document.getElementById('name').value.trim();
            const description = document.getElementById('description').value.trim();
            const language = document.getElementById('language').value.trim();
            const code = document.getElementById('code').value.trim();
            
            let isValid = true;

            // Validation
            if (!name) {
                document.getElementById('nameError').classList.add('show');
                isValid = false;
            } else {
                document.getElementById('nameError').classList.remove('show');
            }

            if (!code) {
                document.getElementById('codeError').classList.add('show');
                isValid = false;
            } else {
                document.getElementById('codeError').classList.remove('show');
            }

            if (!isValid) {
                return;
            }

            // Get selected tags
            const selectedTags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(
                (checkbox) => parseInt(checkbox.value)
            );

            vscode.postMessage({
                command: 'saveSnippet',
                name,
                description,
                language,
                code,
                tagIds: selectedTags,
            });
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });
    </script>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (char) => map[char]);
    }

    private async handleMessage(message: any) {
        switch (message.command) {
            case 'saveSnippet':
                try {
                    const snippetId = await this.db.saveSnippet(
                        message.name,
                        message.description,
                        message.language,
                        message.code,
                        message.tagIds
                    );

                    vscode.window.showInformationMessage(`✓ Snippet "${message.name}" saved successfully!`);
                    // Refresh tree view to show the new snippet with its tags
                    this.treeProvider.refresh();
                    this._panel.dispose();
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to save snippet: ${error}`);
                }
                break;

            case 'cancel':
                this._panel.dispose();
                break;
        }
    }

    private dispose() {
        SaveSnippetPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
