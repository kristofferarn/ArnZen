# ArnZen

A desktop workspace app for managing development projects. Built with Electron, React, and TypeScript.

## Features

- **Multi-project workspaces** — switch between projects with per-project widget state and layout
- **Tiling widget system** — drag-and-drop mosaic layout with minimizable panels
- **Integrated terminal** — multiple terminal instances per project with scrollback persistence
- **Source control** — Git branch management, staging, commits, and push/pull
- **Task management** — per-project to-do lists with status and priority tracking
- **File explorer and viewer** — browse and view project files with syntax highlighting (Monaco)
- **Dark theme** — frameless window with custom title bar

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
npm run dev
```

### Build

```bash
npm run build:win
```

### Release

Releases are automated. Merging into `main` triggers a GitHub Actions workflow that bumps the version, builds the installer, and publishes a GitHub Release. The app checks for updates on launch.

To control the version bump, include `[minor]` or `[major]` in the merge commit message. Default is patch.

## Tech Stack

Electron, electron-vite, React 19, TypeScript, Zustand, Tailwind CSS v4, Monaco Editor, xterm.js, node-pty, lucide-react
