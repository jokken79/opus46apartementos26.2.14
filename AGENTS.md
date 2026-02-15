# AGENTS.md

This repository is a single-page React app (Create React App) for **UNS Estate OS**.
No backend: persistence is client-side via IndexedDB (Dexie). UI is bilingual (Spanish + Japanese).

## Commands (Build / Lint / Test)

Prereqs:
- Node + npm
- Install deps: `npm install`

Dev server:
- `npm start`
- Reads `.env` (`PORT=3004`, `BROWSER=none`)

Production build (also runs typecheck + CRA lint checks):
- `npm run build`

Linting:
- CRA runs ESLint during `npm start` and `npm run build`.
- There is no dedicated `lint` script; if you need one-off lint locally, a common pattern is:
  - `npx eslint "src/**/*.{ts,tsx,js,jsx}"`
  (uses CRA ESLint config; exact behavior depends on installed tooling)

Typecheck only:
- `npx tsc -p tsconfig.json --noEmit`

Tests (Jest via react-scripts):
- Run all tests in watch mode: `npm test`
- Run all tests once (no watch):
  - PowerShell: `$env:CI='true'; npm test`
  - cmd.exe: `set CI=true&& npm test`
  - Alternative: `npm test -- --watchAll=false`

Run a single test file:
- `npm test -- src/utils/validators.test.ts`
- `npm test -- src/utils/propertyHelpers.test.ts`
- `npm test -- src/App.test.tsx`

Run a single test by name (pattern match):
- `npm test -- -t "validateProperty"`
- `npm test -- -t "extractArea"`

Useful Jest flags (pass after `--`):
- `npm test -- --watchAll=false` (run once)
- `npm test -- --runInBand` (serial; helps on constrained CI)
- `npm test -- --testPathPattern validators` (narrow by path)

## Repo-Specific Rules (Cursor / Copilot)

- No Cursor rules found (`.cursor/rules/` and `.cursorrules` are absent).
- No GitHub Copilot instructions found (`.github/copilot-instructions.md` is absent).

## Code Style Guidelines

### Language, formatting, and general style

- TypeScript `strict: true` (see `tsconfig.json`): prefer explicit types at module boundaries.
- Indentation is 2 spaces; keep JSX props readable (wrap long prop lists).
- Strings: repo mostly uses single quotes in TS/TSX; follow the local file’s convention.
- Avoid introducing new formatting tools (no Prettier config currently).

### Imports

Keep imports grouped and stable:
1) React
2) third-party libs (e.g., `lucide-react`, `dexie`, `zod`)
3) local modules (`./components/...`, `./hooks/...`, `./utils/...`)

Additional import rules:
- Use type-only imports when possible: `import type { Property } from './types/database'`.
- Avoid unused icon imports from `lucide-react`; import only what you use.

### Naming conventions

- Components: `PascalCase` (e.g., `ReportsView`, `GlassCard`).
- Hooks: `useX` (e.g., `useIndexedDB`, `useReports`).
- Variables/functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` when truly constant, otherwise `camelCase`.

Domain naming rules used across the app:
- Type/interface field names are English `snake_case` for DB-ish entities (e.g., `rent_cost`, `property_id`).
- UI labels: Spanish + Japanese mix.
- Comments: Spanish is preferred.
- Excel headers: Japanese (e.g., `社員No`, `氏名`, `カナ`, `派遣先`).

### Types and data model

Single source of truth:
- Add/modify entity types in `src/types/database.ts`.
- Keep Zod schemas in sync in `src/utils/validators.ts`.

Validation patterns:
- Prefer Zod `safeParse()` and return structured `{ success, data }` / `{ success, errors }`.
- Keep error payloads user-friendly (Spanish messages are common).

Avoid `any`:
- If unavoidable (e.g., Excel parsed rows), scope it narrowly and document with an ESLint disable comment.

### Persistence and side effects

IndexedDB rules:
- Treat `useIndexedDB` (`src/hooks/useIndexedDB.ts`) as the gateway for persistence.
- Avoid writing to Dexie tables directly from components; route changes through `setDb`.
- Be mindful of async initialization and “fire-and-forget” writes.

Migration rules:
- Legacy localStorage migration exists in `src/db/migrate.ts`; don’t break it casually.

### React patterns

- Most components are functional; `ErrorBoundary` is intentionally a class component.
- Keep `App.tsx` from growing further: extract new logic into hooks/components under `src/hooks/` and `src/components/`.
- Prefer `useCallback` for stable handlers passed deep; use `useMemo` for derived, expensive computations.
- For async derived state (e.g., snapshots), prefer `useEffect` + `useState` (avoid `useMemo` for async).

### Error handling and user feedback

- Use guard clauses early; keep “happy path” readable.
- Log unexpected errors with a clear prefix (existing code uses `console.error('[useIndexedDB] ...', err)` style).
- User-facing errors often use `alert()` in this app; if you add new user feedback, keep it consistent with existing UX.
- Avoid swallowing errors silently unless there is a deliberate fallback.

### Dates, numbers, and edge cases

- Date strings are typically `YYYY-MM-DD`.
- `closingDay: 0` is valid and means end-of-month; use `?? 0` not `|| 0`.
- Tenant activity: `status` is `'active' | 'inactive'`; filter by status for occupancy/capacity.

### UI / styling

- Tailwind is the primary styling mechanism; prefer utility classes over new CSS.
- Custom CSS is used for global effects/animations in `src/App.css` and `src/index.css`.
- Reuse shared UI primitives from `src/components/ui/index.tsx` (e.g., `GlassCard`, `Modal`, `NavButton`).
- Keep accessibility basics: `aria-label`, `role="dialog"`, keyboard escape for modals (see `Modal`).

### Excel / SheetJS (important inconsistency)

- Import flow in `src/App.tsx` uses the bundled dependency: `import * as XLSX from 'xlsx'`.
- Export flow in `src/hooks/useReportExport.ts` expects a global `window.XLSX`.

When changing Excel functionality, pick one approach and keep it consistent:
- Preferred in CRA: import from `xlsx` (bundled) and avoid relying on `window.XLSX`.
- If you keep `window.XLSX`, ensure it is actually loaded (e.g., via a script tag) and update typings accordingly.

## Where To Put New Code

- New domain types: `src/types/database.ts`
- New validation: `src/utils/validators.ts`
- New persistence behaviors: extend `src/hooks/useIndexedDB.ts` (and/or `src/db/*` with care)
- New reusable UI: `src/components/ui/index.tsx`
- New feature views: `src/components/<feature>/...`
- New business logic: `src/hooks/useFeatureName.ts`

## Quick sanity checklist before you hand off

- `npm test -- --watchAll=false`
- `npm run build`
- No new `any` without a narrow, justified boundary
- Types in `src/types/database.ts` and Zod schemas in `src/utils/validators.ts` stay in sync
