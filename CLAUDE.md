# CLAUDE.md — Opus4.6 Apartementos

## Project Overview

**UNS Estate OS** — A property/apartment rental management system for UNS-KIKAKU (ユニバーサル企画株式会社). Built as a single-page React application with client-side IndexedDB persistence (no backend). The UI is bilingual (Spanish + Japanese).

### What it does
- Manages rental properties, tenant assignments, and employee master data
- Tracks rent collection, billing cycles, and financial metrics via reports (5 report tabs)
- Imports data from Excel files (employee lists, rent management sheets) with 3 employee categories (派遣/請負/事務所)
- Supports pro-rata rent calculation, billing modes (split/fixed), auto-split rent redistribution, and tenant history
- Exports reports to Excel and PDF
- Employee zaishoku (在職) filtering based on Excel raw data fields

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19.2 + TypeScript (strict mode) |
| Build | Create React App (react-scripts 5.0.1) |
| Styling | Tailwind CSS 3.4.19 + custom CSS animations (glassmorphism) |
| Fonts | Inter (400/700/900) + Rajdhani (600/700) via `@fontsource` |
| Icons | lucide-react |
| Validation | Zod 4.3 |
| Persistence | IndexedDB via Dexie.js 4.3 (DB: `UNSEstateOS`, version 2) |
| Excel parsing | SheetJS via npm (`xlsx` package, `import * as XLSX from 'xlsx'`) |
| Testing | Jest + React Testing Library (42 tests, 3 suites) |

**Unused dependencies in package.json** (installed but not imported in src/):
- `framer-motion` — not currently used
- `dexie-react-hooks` — not currently used (hooks use raw Dexie API)

## Commands

```bash
npm start          # Dev server on http://localhost:3004
npm run build      # Production build to /build
npm test           # Jest test runner (watch mode)
```

## Project Structure

```
src/
├── App.tsx                          # Main app (~1145 lines, routing + state + modals)
├── App.css                          # Tailwind utilities + custom animations
├── App.test.tsx                     # App render tests (2 tests)
├── index.tsx                        # React entry + ErrorBoundary + @fontsource imports
├── index.css                        # Global styles + Tailwind directives + keyframes
├── react-app-env.d.ts               # CRA type declarations
├── setupTests.ts                    # Jest setup (testing-library/jest-dom)
├── reportWebVitals.ts               # CRA web vitals
├── components/
│   ├── ErrorBoundary.tsx            # React class component error boundary (44 lines)
│   ├── ui/
│   │   └── index.tsx                # GlassCard, StatCard, Modal, NavButton, NavButtonMobile (71 lines)
│   ├── settings/
│   │   └── SettingsView.tsx         # Settings + backup + billing config (89 lines)
│   ├── import/
│   │   └── ImportView.tsx           # Excel drag-drop import (59 lines)
│   └── reports/
│       └── ReportsView.tsx          # Reports UI (5 tabs) with CRUD (835 lines)
├── db/
│   ├── dexie.ts                     # Dexie database schema — 9 tables (52 lines)
│   └── migrate.ts                   # localStorage → IndexedDB auto-migration (102 lines)
├── hooks/
│   ├── useIndexedDB.ts              # Core persistence hook (IndexedDB + beforeunload) (283 lines)
│   ├── useReports.ts                # Report generation + snapshots (270 lines)
│   └── useReportExport.ts           # Excel/PDF export (209 lines)
├── types/
│   └── database.ts                  # All TypeScript interfaces (148 lines)
└── utils/
    ├── validators.ts                # Zod schemas + validate functions (141 lines)
    ├── validators.test.ts           # Validator tests (20 tests)
    ├── propertyHelpers.ts           # isPropertyActive() + extractArea() (36 lines)
    ├── propertyHelpers.test.ts      # Property helper tests (18 tests)
    └── constants.ts                 # Shared constants — COMPANY_INFO (21 lines)
```

## Architecture & Conventions

### State Management
- No external state library (no Redux/MobX). State lives in `App.tsx` via `useState` + `useCallback`.
- Data is persisted to **IndexedDB** through the `useIndexedDB` hook.
- The `useIndexedDB` hook provides: `{ db, setDb, isLoading, error, resetDb }`.
- A `beforeunload` handler flushes pending writes when the tab closes.
- On first load, `src/db/migrate.ts` auto-migrates from legacy localStorage keys (`uns_db_v6_0`, `uns_reports_v1`) to IndexedDB.
- Dexie schema (version 2) defines **9 tables**: `properties`, `tenants`, `employees` (legacy), `employeesGenzai`, `employeesUkeoi`, `employeesStaff`, `config`, `snapshots`, `meta`.

### Data Model (key entities)
- **Property** — Rental unit (address, capacity, rent costs, contract dates, billing mode, room_number, type)
- **Tenant** — Employee assigned to a property (rent contribution, parking fee, entry/exit dates, status: active/inactive)
- **Employee** — Master employee record imported from Excel (社員No, name, kana, company, full_data raw object). Stored in 3 category tables:
  - `employeesGenzai` — 派遣 (Haken/dispatch workers)
  - `employeesUkeoi` — 請負 (contract workers, Okayama)
  - `employeesStaff` — 事務所 (office staff)
  - `employees` — Legacy table (pre-category migration)
- **Config** — App settings (company name, closing day for billing: 0/15/20/25, defaultCleaningFee)
- **MonthlySnapshot** — Report snapshots with totals, occupancy rate, company/property/payroll detail arrays

### Navigation Tabs (6 views)
1. `dashboard` — KPI stats, property overview, alerts
2. `properties` — Property CRUD with active/inactive filter
3. `employees` — Employee master with 3 category tabs (genzai/ukeoi/staff), search, pagination, zaishoku filter
4. `reports` — 5 sub-tabs (company, payroll, tenants, property, history)
5. `import` — Excel drag-drop upload and sync
6. `settings` — Company info, billing config, backup/restore, system reset

### Component Patterns
- All components are functional except `ErrorBoundary` (class component, required by React's error boundary API).
- Custom hooks encapsulate business logic (`useIndexedDB`, `useReports`, `useReportExport`).
- Reusable UI primitives live in `src/components/ui/index.tsx` (GlassCard, StatCard, Modal, NavButton, NavButtonMobile).
- Components receive data/callbacks via props from `App.tsx`.
- ReportsView is the largest component (835 lines) with 3 internal sub-components: MiniKPI, SnapshotDetail, ComparisonView.

### Validation
- Zod schemas in `src/utils/validators.ts` for all entities: `PropertySchema`, `TenantSchema`, `EmployeeSchema`, `AppConfigSchema`, `BackupSchema`, `ExcelEmployeeRowSchema`.
- `validateProperty()`, `validateTenant()`, and `validateBackup()` are called in form submit handlers in `App.tsx`.
- Excel row schemas use Japanese field names (半角カナ headers like `ｱﾊﾟｰﾄ`, `住所`, `家賃`).
- `validateDataIntegrity()` checks FK relationships and capacity constraints.

### External APIs
- **Zipcloud** (`https://zipcloud.ibsnet.co.jp/api/search`) — Postal code → address auto-fill

### Excel / SheetJS
- SheetJS is imported as an npm package: `import * as XLSX from 'xlsx'` (no CDN, no `window.XLSX`).
- Used in App.tsx for Excel file parsing during import and in `useReportExport.ts` for Excel export.
- Employee import detects category from sheet name/content and populates the correct table (genzai/ukeoi/staff).

### Styling Conventions
- Tailwind utility classes are primary.
- Custom CSS for animations (fade-in, slide, glassmorphism effects) in `App.css` and `index.css`.
- Custom CSS classes: `glass-cockpit`, `scanline`, `neon-glow-blue`, `text-glow-blue`, `font-hud`.
- Dark-themed UI with glass-effect panels.
- Fonts: Inter (body) and Rajdhani (HUD/display) loaded via `@fontsource` in `index.tsx`.

## Language & Naming

- **Code comments**: Spanish (e.g., `// Dirección completa formateada`)
- **UI labels**: Mix of Spanish and Japanese depending on context
- **Commit messages**: Bilingual — English conventional commits + Japanese/Spanish descriptions (e.g., `feat(employees): Separate tables for Genzai, Ukeoi, and Staff`)
- **Variable names**: English (camelCase for variables, PascalCase for components/interfaces)
- **Type field names**: English with snake_case (e.g., `rent_cost`, `property_id`, `name_kana`)
- **Excel headers**: Japanese (e.g., `社員No`, `氏名`, `カナ`, `派遣先`)

## Development Guidelines

### When modifying code
1. All types are defined in `src/types/database.ts` — add new interfaces there, not inline.
2. Validation schemas live in `src/utils/validators.ts` — keep in sync with type changes.
3. Database operations go through the `useIndexedDB` hook — never write to IndexedDB directly.
4. The main `App.tsx` is large (~1145 lines); prefer extracting logic into hooks or new components under `src/components/`.
5. UI primitives (GlassCard, Modal, etc.) are in `src/components/ui/` — import from there, do not duplicate inline.
6. Use `isPropertyActive()` from `src/utils/propertyHelpers.ts` — do not write inline active-property filters.
7. ID generation uses `generateId()` with a monotonic counter (avoids `Date.now()` collisions).
8. Employee data is split across 3 category tables (`employeesGenzai`, `employeesUkeoi`, `employeesStaff`). The `employees` table is legacy — new imports go into the category tables.

### When adding features
- Follow existing hook pattern: create `src/hooks/useFeatureName.ts`.
- Add corresponding types to `database.ts`.
- Add Zod validation schema to `validators.ts`.
- Use `lucide-react` for icons (already imported).
- Use Tailwind classes; avoid adding new CSS unless animation-specific.

### Common pitfalls
- Tenant `status` is `'active' | 'inactive'` — filter by status when counting occupancy.
- `closingDay: 0` means end-of-month billing; other values (15, 20, 25) are mid-month. Use `?? 0` not `|| 0` because `0` is a valid value.
- Property `billing_mode` can be `'split'` (rent divided among tenants) or `'fixed'` (fixed per tenant).
- `autoSplitRent()` redistributes rent automatically on tenant add/remove when `billing_mode='split'`.
- Japanese postal codes follow `###-####` format.
- Modal close handlers use `confirmDiscardChanges()` to warn on unsaved changes.
- Employee ID is a string PK from Excel import — not editable.
- Zod 4 quirks: `(z.enum as any)([...])` is required for enum types; use `z.string().length(0)` instead of `z.literal('')`.
- Report snapshots are async — use `useState` + `useEffect`, NOT `useMemo`.
- Employee zaishoku (在職) detection uses multiple Japanese field heuristics (`退職日`, `離職日`, `在職中`, etc.) — see `isEmployeeZaishoku()` and `parseZaishokuLike()` in App.tsx.
- The `AppDatabase` type includes separate arrays: `employees`, `employeesGenzai`, `employeesUkeoi`, `employeesStaff`. When querying all employees, check which category table is relevant.

### Testing
- **42 tests** across 3 suites:
  - `src/utils/propertyHelpers.test.ts` — 18 tests (isPropertyActive, extractArea)
  - `src/utils/validators.test.ts` — 20 tests (Zod schema validation)
  - `src/App.test.tsx` — 2 tests (render, basic integration)
- **Known issue**: `App.test.tsx` line 18 fails (`/Estate OS/i` text not found in rendered output). The header text may have changed since the test was written.
- Run tests with `npm test`.
- Use React Testing Library patterns for component tests.
- App.test.tsx mocks `useIndexedDB` to avoid IndexedDB dependency in tests.

## Environment

```
PORT=3004           # Dev server port
BROWSER=none        # Don't auto-open browser on start
```

## Git Workflow

- Feature branches with PRs (e.g., `claude/feature-name-xxxxx`)
- Conventional commit style: `feat:`, `fix:`, `refactor:`, `docs:`
- No CI/CD pipeline configured
- No Docker setup — static build deployment
