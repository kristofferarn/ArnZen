# ArnZen Project Notes

## Public Repository
This is a **public GitHub repo**. Never commit secrets, credentials, API keys, personal data, or sensitive file paths. Review all changes with this in mind.

## Overview
Desktop workspace app: Electron + React + TypeScript (electron-vite)
Multi-project support with per-project widget state. Dark theme only. Personal app (single user).

## Architecture
- `src/main/` — Electron main process, IPC handlers, file persistence
- `src/preload/` — Context bridge with typed API
- `src/shared/types.ts` — Shared types between main/renderer
- `src/renderer/src/` — React app (stores, components, widgets)
- All persistence goes through IPC bridge in main process — easy to swap backends

## Persistence (current)
- All data centralized under Electron userData (`%APPDATA%/arnzen/`)
- Global: `arnzen-config.json` — project list (`{ id, rootPath }[]`) + last active
- Per-project: `projects/<uuid>/workspace.json` — widget state, layout, settings
- Migration from old `.arnzen/` in-project format runs automatically on first load

## Future Plans
- **Persistence migration**: May switch from local files to either:
  1. User-specified synced folder (multi-workspace)
  2. Firebase free tier (Firestore/Realtime DB) for cloud sync
- Free-tier hosting is sufficient (single user)
- IPC bridge abstraction makes backend swap straightforward (only change main process)

## Branching & Releases
- `develop` — daily work branch
- `main` — release branch; merging triggers GitHub Actions to auto-bump version, build, and publish
- Auto-update via `electron-updater` checks GitHub Releases on app launch

## Tech Stack
electron-vite, React 19, TypeScript strict, Zustand, Tailwind CSS v4, lucide-react, xterm.js, node-pty, Monaco Editor, uuid
Frameless window with custom title bar
