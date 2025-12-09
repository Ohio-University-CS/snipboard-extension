# Snipboard VSCode Extension

A VS Code extension for [Snipboard](https://github.com/Ohio-University-CS/snipboard), the code snippet manager

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- VS Code (v1.106.1 or higher)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd snipboard-extension
```

2. Install dependencies:
```bash
npm install
```

3. Configure your Snipboard database path in `.env`:
```bash
DB_PATH=/path/to/your/snipboard.db
```

### Running the Extension

**Development Mode:**
```bash
npm run watch
```
This starts the TypeScript compiler in watch mode and automatically recompiles on changes.

**Build:**
```bash
npm run compile
```
Compiles TypeScript to JavaScript in the `out/` directory.

**Launch in VS Code:**
1. Press `F5` to open the extension in a new VS Code window
2. Or go to Run → Start Debugging

### Features

- **Save Snippets**: Select code and save it as a reusable snippet with tags
- **Search Snippets**: Quickly search and insert snippets for your current language
- **Browse Snippets**: View all snippets organized by tags in the sidebar
- **Copy to Clipboard**: Copy snippets without inserting them

### Commands

- `Snipboard: Save Snippet` - Save selected code as a snippet
- `Snipboard: Search Snippets` - Search and insert snippets
- `Snipboard: Refresh Snippet Explorer` - Refresh the snippet tree view

### Context Menu

Right-click on snippets in the explorer to:
- **Insert** - Insert snippet at cursor
- **Copy** - Copy snippet to clipboard

---
