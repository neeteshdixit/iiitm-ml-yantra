# iiitm-ml-yantra

Lightweight instructions for running the project locally and fixing common setup issues.

## Overview
This repository contains a React + Vite frontend in `frontend/`.

## Prerequisites
- Node.js 18+ recommended
- npm (bundled with Node.js)

## Quick Start (Recommended: from repo root)
```powershell
npm run install:frontend
npm run dev
```

## Build and Preview
```powershell
npm run build
npm run preview
```

## Direct Frontend Commands
If you prefer working inside `frontend/`:

```powershell
cd frontend
npm install
npm run dev
```

## Fix: "Failed to run dependency scan" / unresolved imports
If you see errors like unresolved `react-router-dom`, `react-hot-toast`, or `axios`:

1. Make sure dependencies are installed for the frontend:
```powershell
npm run install:frontend
```

2. Start the app using the root script (not raw `vite` from the repo root):
```powershell
npm run dev
```

3. If needed, reinstall frontend dependencies cleanly:
```powershell
cd frontend
rd /s /q node_modules
del package-lock.json
npm install
npm run dev
```
