# CLAUDE.md — Opus4.6 Apartementos

## Project Overview

**UNS Estate OS** — A property/apartment rental management system for UNS-KIKAKU (ユニバーサル企画株式会社). Built as a single-page React application with client-side IndexedDB persistence (no backend). The UI is bilingual (Spanish + Japanese).

### What it does
- Manages rental properties, tenant assignments, and employee master data
- Tracks rent collection, billing cycles, and financial metrics via reports (5 report tabs)
- Imports data from Excel files (employee lists, rent management sheets)
- Supports pro-rata rent calculation, billing modes (split/fixed), auto-split rent redistribution, and tenant history
- Exports reports to Excel and PDF

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript (strict mode) |
| Build | Create React App (react-scripts 5.0.1) |
| Styling | Tailwind CSS 3.4 + custom CSS animations (glassmorphism) |
| Icons | lucide-react |
| Validation | Zod 3.x |
| Persistence | IndexedDB via Dexie.js 4.3 (DB: `UNSEstateOS`) |
| Excel parsing | SheetJS (loaded dynamically from CDN with SRI integrity) |
| Testing | Jest + React Testing Library (40 tests) |

## Commands

```bash
npm start          # Dev server on http://localhost:3004
npm run build      # Production build to /build
npm test           # Jest test runner (watch mode)
```

## Project Structure

```
src/
├── App.tsx                          # Main app (~777 lines, routing + state + modals)
├── App.css                          # Tailwind utilities + custom animations
├── App.test.tsx                     # App render tests (2 tests)
├── index.tsx                        # React entry + ErrorBoundary wrapper
├── index.css                        # Global styles + Tailwind directives + keyframes
├── components/
│   ├── ErrorBoundary.tsx            # React class component error boundary
│   ├── ui/
│   │   └── index.tsx                # GlassCard, StatCard, Modal, NavButton, NavButtonMobile
│   ├── dashboard/
│   │   └── DashboardView.tsx        # Dashboard metrics + financial overview
│   ├── properties/
│   │   └── PropertiesView.tsx       # Property cards + filter (active/history)
│   ├── employees/
│   │   └── EmployeesView.tsx        # Employee master table with categories
│   ├── settings/
│   │   └── SettingsView.tsx         # Settings + backup + billing config
│   ├── import/
│   │   └── ImportView.tsx           # Excel drag-drop import
│   └── reports/
│       └── ReportsView.tsx          # Reports UI (5 tabs) with CRUD
├── db/
│   ├── dexie.ts                     # Dexie database schema (UNSEstateOS)
│   └── migrate.ts                   # localStorage → IndexedDB auto-migration
├── hooks/
│   ├── useIndexedDB.ts              # Core persistence hook (IndexedDB + beforeunload)
│   ├── useExcelImport.ts            # Excel file processing hook
│   ├── useReports.ts                # Report generation + snapshots
│   └── useReportExport.ts           # Excel/PDF export
├── types/
│   └── database.ts                  # All TypeScript interfaces (central type definitions)
└── utils/
    ├── validators.ts                # Zod schemas + validate functions
    ├── validators.test.ts           # Validator tests (20 tests)
    ├── propertyHelpers.ts           # isPropertyActive() + extractArea()
    ├── propertyHelpers.test.ts      # Property helper tests (18 tests)
    └── constants.ts                 # Shared constants (COMPANY_INFO)
```

## Architecture & Conventions

### State Management
- No external state library (no Redux/MobX). State lives in `App.tsx` via `useState` + `useCallback`.
- Data is persisted to **IndexedDB** through the `useIndexedDB` hook.
- The `useIndexedDB` hook provides: `{ db, setDb, isLoading, error, resetDb }`.
- A `beforeunload` handler flushes pending writes when the tab closes.
- On first load, `src/db/migrate.ts` auto-migrates from legacy localStorage keys (`uns_db_v6_0`, `uns_reports_v1`) to IndexedDB.
- Dexie schema defines 6 tables: properties, tenants, employees, config, snapshots, meta.

### Data Model (key entities)
- **Property** — Rental unit (address, capacity, rent costs, contract dates, billing mode)
- **Tenant** — Employee assigned to a property (rent contribution, parking fee, entry/exit dates, status: active/inactive)
- **Employee** — Master employee record imported from Excel (社員No, name, kana, company)
- **Config** — App settings (company name, closing day for billing: 0/15/20/25)
- **Snapshot** — Report snapshots for historical data

### Component Patterns
- All components are functional except `ErrorBoundary` (class component, required by React's error boundary API).
- Custom hooks encapsulate business logic (`useIndexedDB`, `useReports`, `useReportExport`).
- Reusable UI primitives live in `src/components/ui/index.tsx` (GlassCard, StatCard, Modal, NavButton).
- Components receive data/callbacks via props from `App.tsx`.

### Validation
- Zod schemas in `src/utils/validators.ts` for all entities.
- `validateProperty()` and `validateTenant()` are called in form submit handlers in `App.tsx`.
- Excel row schemas use Japanese field names (半角カナ headers like `ｱﾊﾟｰﾄ`, `住所`, `家賃`).
- `validateDataIntegrity()` checks FK relationships and capacity constraints.

### External APIs
- **Zipcloud** (`https://zipcloud.ibsnet.co.jp/api/search`) — Postal code → address auto-fill
- **SheetJS CDN** — Loaded dynamically onto `window.XLSX` for Excel parsing. Has SRI integrity hash (`sha384`) and `crossOrigin` attribute for security.

### Styling Conventions
- Tailwind utility classes are primary.
- Custom CSS for animations (fade-in, slide, glassmorphism effects) in `App.css` and `index.css`.
- Dark-themed UI with glass-effect panels.

## Language & Naming

- **Code comments**: Spanish (e.g., `// Dirección completa formateada`)
- **UI labels**: Mix of Spanish and Japanese depending on context
- **Commit messages**: Bilingual — Spanish descriptions + Japanese feature names (e.g., `feat: 管理機能強化 - 課金モード、日割り計算、社員台帳`)
- **Variable names**: English (camelCase for variables, PascalCase for components/interfaces)
- **Type field names**: English with snake_case (e.g., `rent_cost`, `property_id`, `name_kana`)
- **Excel headers**: Japanese (e.g., `社員No`, `氏名`, `カナ`, `派遣先`)

## Development Guidelines

### When modifying code
1. All types are defined in `src/types/database.ts` — add new interfaces there, not inline.
2. Validation schemas live in `src/utils/validators.ts` — keep in sync with type changes.
3. Database operations go through the `useIndexedDB` hook — never write to IndexedDB directly.
4. The main `App.tsx` has been modularized (~777 lines); views are extracted into `src/components/<feature>/`. Continue this pattern for new views.
5. UI primitives (GlassCard, Modal, etc.) are in `src/components/ui/` — import from there, do not duplicate inline.
6. Use `isPropertyActive()` from `src/utils/propertyHelpers.ts` — do not write inline active-property filters.
7. ID generation uses `generateId()` with a monotonic counter (avoids `Date.now()` collisions).

### When adding features
- Follow existing hook pattern: create `src/hooks/useFeatureName.ts`.
- Add corresponding types to `database.ts`.
- Add Zod validation schema to `validators.ts`.
- Use `lucide-react` for icons (already imported).
- Use Tailwind classes; avoid adding new CSS unless animation-specific.

### Common pitfalls
- `window.XLSX` is loaded dynamically — always check `(window as any).XLSX` before using.
- Tenant `status` is `'active' | 'inactive'` — filter by status when counting occupancy.
- `closingDay: 0` means end-of-month billing; other values (15, 20, 25) are mid-month. Use `?? 0` not `|| 0` because `0` is a valid value.
- Property `billing_mode` can be `'split'` (rent divided among tenants) or `'fixed'` (fixed per tenant).
- `autoSplitRent()` redistributes rent automatically on tenant add/remove when `billing_mode='split'`.
- Japanese postal codes follow `###-####` format.
- Modal close handlers use `confirmDiscardChanges()` to warn on unsaved changes.
- Employee ID is a string PK from Excel import — not editable.
- Zod 3 quirks: `(z.enum as any)([...])` is used for enum types; use `z.string().length(0)` instead of `z.literal('')`.
- Report snapshots are async — use `useState` + `useEffect`, NOT `useMemo`.

### Testing
- **40 tests** across 3 suites:
  - `src/utils/propertyHelpers.test.ts` — 18 tests (isPropertyActive, extractArea)
  - `src/utils/validators.test.ts` — 20 tests (Zod schema validation)
  - `src/App.test.tsx` — 2 tests (render, basic integration)
- Run tests with `npm test`.
- Use React Testing Library patterns for component tests.

## Environment

```
PORT=3004           # Dev server port
BROWSER=none        # Don't auto-open browser on start
```

## Git Workflow

- Feature branches with PRs (e.g., `claude/feature-name-xxxxx`)
- No CI/CD pipeline configured
- No Docker setup — static build deployment
