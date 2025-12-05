import * as vscode from 'vscode';
import { DatabaseManager, Tag, Snippet } from '../db/sqliteService';

export class SnippetTreeProvider implements vscode.TreeDataProvider<SnippetTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SnippetTreeItem | undefined | null | void> =
        new vscode.EventEmitter<SnippetTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SnippetTreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private db: DatabaseManager;

    constructor() {
        this.db = DatabaseManager.getInstance();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(null);
    }

    getTreeItem(element: SnippetTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SnippetTreeItem): Promise<SnippetTreeItem[]> {
        if (!element) {
            // Root level: show tags
            return this.getTagItems();
        } else if (element.type === 'tag' && element.numId) {
            // Show snippets for this tag
            return this.getSnippetsForTag(element.numId);
        } else if (element.type === 'untagged') {
            // Show untagged snippets
            return this.getUntaggedSnippets();
        }
        return [];
    }

    private async getTagItems(): Promise<SnippetTreeItem[]> {
        const tags = await this.db.getTags();
        const items = tags.map(
            (tag) =>
                new SnippetTreeItem(
                    tag.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'tag',
                    tag.id
                )
        );

        // Add untagged folder if there are untagged snippets
        const untaggedSnippets = await this.db.getUntaggedSnippets();
        if (untaggedSnippets.length > 0) {
            items.push(
                new SnippetTreeItem(
                    'Untagged',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'untagged',
                    -1
                )
            );
        }

        return items;
    }

    private async getSnippetsForTag(tagId: number): Promise<SnippetTreeItem[]> {
        const snippets = await this.db.getSnippetsByTag(tagId);
        return snippets.map(
            (snippet) =>
                new SnippetTreeItem(
                    snippet.name,
                    vscode.TreeItemCollapsibleState.None,
                    'snippet',
                    snippet.id,
                    snippet,
                    tagId  // Pass parent tag ID
                )
        );
    }

    private async getUntaggedSnippets(): Promise<SnippetTreeItem[]> {
        const snippets = await this.db.getUntaggedSnippets();
        return snippets.map(
            (snippet) =>
                new SnippetTreeItem(
                    snippet.name,
                    vscode.TreeItemCollapsibleState.None,
                    'snippet',
                    snippet.id,
                    snippet,
                    undefined  // No parent tag for untagged
                )
        );
    }
}

export class SnippetTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'tag' | 'snippet' | 'untagged',
        public readonly numId: number,
        public readonly snippet?: any,
        public readonly parentTagId?: number  // Track which tag this snippet belongs to
    ) {
        super(label, collapsibleState);
        
        // Create unique IDs for each tree node
        // For tags and untagged: just use type_id
        // For snippets: include parent tag to make it unique even if snippet appears under multiple tags
        if (type === 'snippet' && parentTagId !== undefined) {
            this.id = `snippet_${numId}_tag_${parentTagId}`;
        } else if (type === 'snippet') {
            this.id = `snippet_${numId}_untagged`;
        } else {
            this.id = `${type}_${numId}`;
        }

        if (type === 'snippet' && snippet) {
            // Don't set a click command - let context menu handle it
            this.contextValue = 'snippet';
            this.iconPath = new vscode.ThemeIcon('file-code');
            this.description = `${snippet.language}`;
        } else if (type === 'tag') {
            this.contextValue = 'tag';
            this.iconPath = new vscode.ThemeIcon('tag');
        } else if (type === 'untagged') {
            this.contextValue = 'untagged';
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
}
