# iiitm-ml-yantra

Lightweight instructions (aligned with PRD) for running the project locally and troubleshooting common issues.

## Overview
This repository contains a React + Vite frontend inside the `frontend/` directory.

## Prerequisites
- Node.js (recommended >= 18). If you use nvm for Windows, ensure the active Node version is correct.
- npm (bundled with Node) or yarn/pnpm if you prefer.

## Quick start — frontend (development)
1. From the repository root (recommended):

```powershell
cd frontend
npm install
npm run dev
```

2. If you'd rather run the frontend dev server from the repo root without changing directories:

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

The frontend's `package.json` already defines a `dev` script that runs Vite.

## Build & Preview
From `frontend/`:

```powershell
npm run build
npm run preview
```

## Common issue: "Missing script: \"dev\""
Symptoms: running `npm run dev` from the repository root produces the error:

```
npm ERR! Missing script: "dev"
```

Why it happens:
- That error means the package.json in the current working directory doesn't define a `dev` script. In this repo the frontend's `package.json` (frontend/package.json) contains the `dev` script, so you must run the command inside `frontend/` or prefix it as shown above.

How to fix:
- Ensure you're in the `frontend` folder before running `npm run dev`:
  - `cd frontend` then `npm run dev`
- Or run from root with the prefix approach:
  - `npm --prefix frontend run dev`
- If you still see errors:
  1. Remove `node_modules` and the lockfile and reinstall:

```powershell
cd frontend
rd /s /q node_modules
del package-lock.json
npm install
npm run dev
```

  2. Check `frontend/package.json` contains the `dev` script (it should be `"dev": "vite"`).
  3. Verify your Node.js version is supported.

## Notes for maintainers / PRD coverage
- This README has been updated to match the PRD guidance for developer onboarding: clear, minimal steps to run the frontend dev server and explicit troubleshooting for the "Missing script: dev" error.

If you'd like, I can also:
- Add a short `dev` script at the repository root that proxies into `frontend` (e.g. a root-level package.json with scripts that delegate to `frontend`), or
- Add a CONTRIBUTING.md with more environment setup notes.


