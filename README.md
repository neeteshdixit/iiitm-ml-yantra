 # ML Yantra

ML Yantra is a web-based, no-code machine learning platform and interactive learning academy that helps users prepare data, train models, and learn ML concepts without writing code. The platform combines an intelligent AI assistant, a visual data cleaning workspace, an end-to-end model training flow, and a gamified ML Academy for hands-on learning.

## Key Features

- No-code data cleaning: upload CSV/Excel, multi-sheet workspaces, null handling, duplicate removal, type conversion, encoding, filtering, and column management
- Visual data exploration: histograms, box plots, correlation heatmaps, null pattern matrices, scatter plots, and pair plots
- Model training: classification and regression algorithms (Logistic Regression, Random Forest, Decision Tree, SVM, Linear Regression, SVR, XGBoost) with evaluation visualizations (confusion matrix, ROC, precision/recall, feature importance)
- AI Assistant & ML Academy: contextual suggestions, explanations, interactive lessons, XP/badges, and a sandbox with sample datasets
- Export & integration: download cleaned data and predictions, export model configs (MVP + roadmap)

## Quickstart (Frontend)

Requirements: Node.js 18+ (Node 22 recommended for some build tools), npm or pnpm

Install dependencies:

```powershell
npm install
```

Run the development server:

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

## Project structure (overview)

- src/ — React frontend (Vite)
- public/ — static assets (images, icons)
- prd.md — Product Requirements Document (full design, features, and API surface)

For backend and full-stack details, see `prd.md`. The PRD describes a FastAPI backend, Python ML stack (pandas, scikit-learn, XGBoost), and API endpoints used by the frontend.

## Data & Models

ML Yantra focuses on end-to-end supervised learning workflows: target selection, feature selection, train/test split, and algorithm comparison. Visual evaluation (confusion matrix, ROC, learning curves) helps users choose and understand models. The PRD lists supported algorithms and metrics.

## Development

- Follow the code style in the repo. ESLint is configured in `eslint.config.js`.
- Scripts available in `package.json`:
  - `dev` - start Vite dev server
  - `build` - build production assets
  - `preview` - locally preview production build
  - `lint` - run ESLint

## Contributing

Contributions are welcome. See `prd.md` for the product vision and feature priorities. If you plan to contribute:

1. Open an issue describing the feature or bug.
2. Create a branch `feat/your-feature` or `fix/issue-number`.
3. Add tests for new features where applicable.
4. Open a PR with a clear description and link to relevant PRD sections.

## License

No LICENSE file is present in this repository. The project PRD (see `prd.md`) contains the product specification; add a `LICENSE` file (for example MIT or Apache-2.0) to make licensing explicit.

---

For the full product specification, architecture, and implementation timeline, read `prd.md` in the project root.
