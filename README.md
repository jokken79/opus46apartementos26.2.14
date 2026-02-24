# UNS Estate OS — Opus 4.6 Apartementos

> Property & apartment rental management system for **ユニバーサル企画株式会社** (UNS-Kikaku)

## Overview

A single-page React application for managing rental properties, tenant assignments, employee master data, billing cycles, and financial reporting. Client-side only — no backend required. Data persists in IndexedDB via Dexie.js.

## Tech Stack

- **React 19** + TypeScript (strict mode)
- **Tailwind CSS 3.4** + custom glassmorphism animations
- **Zod 3.x** for validation
- **Dexie.js 4.3** (IndexedDB persistence)
- **SheetJS** for Excel import/export
- **lucide-react** icons

## Quick Start

```bash
npm install
npm start          # Dev server → http://localhost:3004
```

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Development server (port 3004) |
| `npm test` | Run 40 tests (3 suites) |
| `npm run build` | Production build to `/build` |
| `npx tsc --noEmit` | TypeScript check (0 errors) |

## Features

- 🏢 **Property Management** — CRUD with capacity tracking, billing modes (split/fixed)
- 👥 **Tenant Management** — Assignment, rent contributions, parking fees, pro-rata calculation
- 📊 **Financial Reports** — 5 report tabs with snapshots and history comparison
- 📁 **Excel Import/Export** — Drag-and-drop import, PDF/Excel export
- 🔄 **Billing Cycles** — Configurable closing day (0/15/20/25)
- 💾 **Backup/Restore** — JSON backup with data integrity validation

## Project Structure

```
src/
├── App.tsx                     # Main routing + state (~777 lines)
├── components/
│   ├── ui/                     # GlassCard, Modal, NavButton, StatCard
│   ├── dashboard/              # DashboardView
│   ├── properties/             # PropertiesView
│   ├── employees/              # EmployeesView
│   ├── reports/                # ReportsView (5 tabs)
│   ├── import/                 # ImportView (Excel drag-drop)
│   └── settings/               # SettingsView + backup
├── hooks/                      # useIndexedDB, useExcelImport, useReports, useReportExport
├── types/database.ts           # Central type definitions
├── utils/                      # Validators (Zod), propertyHelpers, constants
└── db/                         # Dexie schema + localStorage migration
```

## License

Private — ユニバーサル企画株式会社
