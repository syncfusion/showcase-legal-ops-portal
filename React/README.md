# Legal Matter & Contract Management Portal

An enterprise React showcase application that demonstrates how Syncfusion Essential Studio components can power a modern legal operations platform for in-house legal teams.

## Overview

This portal provides a unified interface for managing legal matters, contracts, documents, and alerts. It features real-time dashboards and comprehensive analytics — all built with Syncfusion's React UI component suite.

## Business Scenario

In-house legal teams at large corporations typically juggle hundreds of active matters and contracts across disparate spreadsheets, shared drives, and email threads. This leads to missed renewal deadlines, undetected contractual risk exposure, and lack of visibility into legal spend and workload.

The Legal Matter & Contract Management Portal addresses these challenges by providing:

- **Matter Management**: Track case lifecycles from intake through resolution with practice area, budget, and priority tracking.
- **Contract Lifecycle Management (CLM)**: Manage contracts through Draft → Review → Approved → Signed → Active stages with automated expiration alerts.
- **Obligation Tracking**: Monitor payment schedules, compliance filings, performance milestones, and reporting deadlines.
- **Document Repository**: Centralized document storage with versioning and metadata.
- **Analytics & Reporting**: Executive dashboards and analytics on contract portfolio health, matter distribution, and status.

## Target Personas

| Persona | Role | Primary Screens |
|---|---|---|
| General Counsel | Chief legal officer | Dashboard, Analytics, Alerts |
| Senior Associate | Senior contract attorney | Contracts, Contract Detail, Documents |
| Legal Ops Manager | Operations and process owner | Matters, Obligations, Calendar |
| Paralegal | Support and administrative | Documents, Alerts, Obligations |

## Components Used

This application demonstrates the following Syncfusion React components:

- **DataGrid** (`ej2-react-grids`) — Matter list, contract work queue, obligations tracker, clauses grid, alerts grid
- **Charts** (`ej2-react-charts`) — Dashboard KPIs, contract status distribution, matter status distribution, risk distribution analytics
- **Scheduler** (`ej2-react-schedule`) — Obligations calendar view with deadlines and milestones
- **File Manager** (`ej2-react-filemanager`) — Document repository browser
- **PDF Viewer** (`ej2-react-pdfviewer`) — Contract document preview (integrated)


## Run Locally

### Prerequisites

- Node.js 18+
- npm 9+
- Syncfusion license key (optional for local development; component watermark appears without it)

### Setup

```bash
# Navigate to the app directory
cd React

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.


### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server on port 3000 |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run typecheck` | Run `tsc --noEmit` for type validation |
| `npm run lint` | Run ESLint on `.ts` and `.tsx` files |
| `npm run preview` | Preview the production build locally |

## Troubleshooting

- **Syncfusion Watermark**: If you see a watermark on components, it means a valid license key has not been provided. You can obtain a license key from the Syncfusion website.
- **Dependency Issues**: If `npm install` fails, ensure you are using a compatible Node.js version (18+). Try deleting `node_modules` and `package-lock.json` and running `npm install` again.
- **Build Errors**: If `npm run build` fails, check the terminal output for TypeScript errors. Ensure all types are correctly defined in the `src/models` directory.
- **Port Conflicts**: If port 3000 is already in use, Vite will automatically attempt to use the next available port. Check the terminal output for the correct URL.

## Syncfusion License

This application requires a valid Syncfusion license key to render components without a trial watermark. In production, set your license key via environment variable:

```typescript
// In src/App.tsx or src/main.tsx
import { registerLicense } from '@syncfusion/ej2-base';
registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY || '');
```

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 4.5
- **Routing**: React Router v6
- **UI Components**: Syncfusion Essential Studio for React (24.x)
