import sqlite3 from 'sqlite3';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Database is in src/db/snipboard.db, but this code compiles to out/db/
// const DB_PATH = path.join(__dirname, '..', '..', 'src', 'db', 'snipboard.db');
const DB_PATH = path.join(__dirname, '..', '..', '..', '..', 'snipboard', 'build', 'snipboard.db'); // path to my local DB


export interface Tag {
    id: number;
    name: string;
}

export interface Snippet {
    id: number;
    name: string;
    description: string;
    language: string;
    contents: string;
    folder: string | null;
    favorite: number;
    timesCopied: number;
}

export interface SnippetWithTags extends Snippet {
    tags: Tag[];
}

export class DatabaseManager {
    private static instance: DatabaseManager;
    private db: sqlite3.Database;

    private constructor() {
        console.log('Opening database at:', DB_PATH);
        this.db = new sqlite3.Database(DB_PATH, (err: Error | null) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Database opened successfully');
            }
        });
        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
    }

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    /**
     * Fetch all tags ordered by name
     */
    public async getTags(): Promise<Tag[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT id, name FROM Tag ORDER BY name ASC', (err: Error | null, rows: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve((rows as Tag[]) || []);
                }
            });
        });
    }

    /**
     * Search snippets by name/description and language
     */
    public async searchSnippets(query: string, language: string): Promise<Snippet[]> {
        const searchPattern = `%${query}%`;
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM Snippet WHERE (name LIKE ? OR description LIKE ?) AND language = ? ORDER BY name ASC',
                [searchPattern, searchPattern, language],
                (err: Error | null, rows: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((rows as Snippet[]) || []);
                    }
                }
            );
        });
    }

    /**
     * Save a new snippet with associated tags
     */
    public async saveSnippet(
        name: string,
        description: string,
        language: string,
        contents: string,
        tagIds: number[]
    ): Promise<number> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO Snippet (name, description, language, contents, folder, favorite, timesCopied) VALUES (?, ?, ?, ?, NULL, 0, 0)',
                [name, description, language, contents],
                (err: Error | null) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Get the last inserted ID
                    this.db.get('SELECT last_insert_rowid() as id', (err: Error | null, row: any) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const snippetId = row.id;
                        let completed = 0;
                        let hasError = false;
                        
                        // resolve if no tags
                        if (tagIds.length === 0) {
                            resolve(snippetId);
                            return;
                        }

                        // Insert tag links
                        for (const tagId of tagIds) {
                            this.db.run(
                                'INSERT INTO SnippetTagLink (snippetId, tagId) VALUES (?, ?)',
                                [snippetId, tagId],
                                (err: Error | null) => {
                                    if (err && !hasError) {
                                        hasError = true;
                                        reject(err);
                                        return;
                                    }
                                    completed++;
                                    if (completed === tagIds.length && !hasError) {
                                        resolve(snippetId);
                                    }
                                }
                            );
                        }
                    });
                }
            );
        });
    }

    /**
     * Increment the timesCopied counter for a snippet
     */
    public async incrementTimesCopied(snippetId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE Snippet SET timesCopied = timesCopied + 1 WHERE id = ?',
                [snippetId],
                (err: Error | null) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Get all snippets with their associated tags
     */
    public async getSnippetsWithTags(): Promise<SnippetWithTags[]> {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM Snippet ORDER BY name ASC', async (err: Error | null, snippets: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                const snippetList = (snippets as Snippet[]) || [];
                const result: SnippetWithTags[] = [];

                for (const snippet of snippetList) {
                    const tags = await new Promise<Tag[]>((tagResolve) => {
                        this.db.all(
                            'SELECT t.id, t.name FROM Tag t INNER JOIN SnippetTagLink stl ON t.id = stl.tagId WHERE stl.snippetId = ? ORDER BY t.name ASC',
                            [snippet.id],
                            (err: Error | null, rows: any) => {
                                tagResolve((rows as Tag[]) || []);
                            }
                        );
                    });

                    result.push({
                        ...snippet,
                        tags,
                    });
                }

                resolve(result);
            });
        });
    }

    /**
     * Get snippets for a specific tag
     */
    public async getSnippetsByTag(tagId: number): Promise<Snippet[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT s.* FROM Snippet s INNER JOIN SnippetTagLink stl ON s.id = stl.snippetId WHERE stl.tagId = ? ORDER BY s.name ASC',
                [tagId],
                (err: Error | null, rows: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((rows as Snippet[]) || []);
                    }
                }
            );
        });
    }

    /**
     * Get snippets with no tags
     */
    public async getUntaggedSnippets(): Promise<Snippet[]> {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT s.* FROM Snippet s WHERE s.id NOT IN (SELECT snippetId FROM SnippetTagLink) ORDER BY s.name ASC',
                (err: Error | null, rows: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve((rows as Snippet[]) || []);
                    }
                }
            );
        });
    }

    /**
     * Get a specific snippet by ID
     */
    public async getSnippetById(snippetId: number): Promise<Snippet | null> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM Snippet WHERE id = ?', [snippetId], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve((row as Snippet) || null);
                }
            });
        });
    }

    /**
     * Close the database connection
     */
    public close(): void {
        this.db.close((err: Error | null) => {
            if (err) {
                console.error('Error closing database:', err);
            }
        });
    }
}


