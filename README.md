# Snipboard

## Project Description

This is a VSCode extension for [SnipBoard](https://github.com/Ohio-University-CS/snipboard), a fast, organized, and searchable desktop tool for storing and retrieving personal code snippets.
Its purpose is to help developers stay focused, reuse their best code, and eliminate the time wasted digging through old projects, screenshots, and notes for small pieces of reusable logic.

## Demo

![Snipboard Demo](static/demo.gif)

## Features

- **Save Snippets**: Select code and save it as a reusable snippet with optional tags and descriptions
- **Search Snippets**: Quickly search and insert snippets filtered by your current language
- **Browse by Tags**: View all snippets organized hierarchically by tags in the sidebar explorer
- **Track Usage**: Most frequently copied snippets appear first in search results for quick access
- **Copy to Clipboard**: Copy snippets without inserting them into your editor
- **Automatic Refresh**: Tree view updates instantly after saving or modifying snippets
- **Context Menu Integration**: Right-click on snippets for instant Insert or Copy actions

## Installation

### Prerequisites

- Node.js (v18 or higher)
- VS Code (v1.106.1 or higher)
- Git (for cloning the repository)

### Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd snipboard-extension
```

2. Install dependencies:
```bash
npm install
```

3. Configure your database path in `.env`:
```bash
DB_PATH=/path/to/your/snipboard.db
```

## How to Run

### Development Mode

Start the TypeScript compiler in watch mode:
```bash
npm run watch
```

### Build

Compile TypeScript to JavaScript:
```bash
npm run compile
```

### Launch in VS Code

1. Press `F5` to open the extension in a new VS Code window, or
2. Go to Run → Start Debugging

The extension will activate automatically when VS Code starts (`onStartupFinished`).

## Usage Examples

### Save a Snippet

1. Select code in your editor
2. Run command: `Snipboard: Save Snippet`
3. Enter snippet name, description (optional), and select tags
4. Click "Save Snippet"
5. Snippet appears in the sidebar under its assigned tags

### Search and Insert

1. Run command: `Snipboard: Search Snippets`
2. Type to search snippets for your current language
3. Results show most-used first (sorted by `timesCopied`)
4. Select a snippet to insert at cursor position

### Context Menu

1. Expand a tag in the sidebar to view snippets
2. Right-click on a snippet to see options:
   - **Insert** - Insert snippet at cursor position
   - **Copy** - Copy snippet to clipboard (updates usage count)

## Known Issues

- Icon property in `package.json` requires a 128x128px PNG file in `images/` folder
- Database path must be configured in `.env` before running the extension
- SQLite database file must exist before the extension starts

## Future Work

- Implement snippet categories and nested organization
- Add syntax highlighting in snippet previews
- Support for favorite snippets
- Search filters by language, tags, and usage frequency
- Snippet templates with variable substitution

## Contributors

- **Kyle Carey** - Developed the extension

---
