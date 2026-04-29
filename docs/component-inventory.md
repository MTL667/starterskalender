# Component Inventory

> Generated: 2026-04-08 | Scan level: deep | 38 components scanned

## Overview

The application uses **38 React components** organized into domain-specific directories. UI primitives are built on **Radix UI** with **Tailwind CSS** styling via `class-variance-authority`. All feature components use **next-intl** for translations and many integrate with the **SSE event bus** for real-time updates.

## Component Architecture

```
components/
├── admin/           # HR Admin-only components (4)
├── dashboard/       # Dashboard widgets (5)
├── kalender/        # Calendar feature (3)
├── layout/          # App shell & navigation (3)
├── providers/       # React context providers (1)
├── starters/        # Starter list feature (1)
├── tasks/           # Task components (3)
├── ui/              # Radix UI primitives (15)
└── [root]           # Cross-cutting components (3)
```

## Admin Components (`components/admin/`)

| Component | Type | Features |
|-----------|------|----------|
| **KpiDashboard** | Analytics page | Recharts line charts; period + trend controls; sortable entity comparison table; task completion, lead time, material coverage metrics |
| **UserNotificationPrefsDialog** | Form dialog | Per-entity notification toggles (weekly, monthly, quarterly, yearly); loads/patches via API |
| **JobRoleMaterialsDialog** | Form dialog | Materials CRUD per job role; copy materials from another role; search + add |
| **UserMembershipsDialog** | Form dialog | Entity membership add/remove; entity picker |

## Dashboard Components (`components/dashboard/`)

| Component | Type | Features |
|-----------|------|----------|
| **MyTasks** | Task widget | SSE-subscribed (`task:*`); shows assigned tasks; hidden if no tasks ever; links to /taken |
| **RecentStarters** | Starter widget | Current/next year starters; 7-day highlight; opens StarterDialog; date-fns locale |
| **YTDStats** | Statistics | Year-to-date counts via `/api/stats/ytd`; per-entity badges |
| **MonthlyCharts** | Charts | Recharts stacked/grouped bars; onboarding/offboarding/migration per month; type filter |
| **EntityMonthlyCharts** | Charts | Recharts; entity + type breakdown; aggregated by month |

## Calendar Components (`components/kalender/`)

| Component | Type | Features |
|-----------|------|----------|
| **CalendarView** | Feature shell | SSE-subscribed (`starter:*`); week/month/year/custom views; search + entity + type filters; CSV/PDF/XLSX export; pending-boarding section (HR_ADMIN); deep-link via `starterId` query param |
| **StarterCard** | Display card | Type icons (onboarding/offboarding/migration); entity color badge; cancelled/pending states; notes preview |
| **StarterDialog** | Complex form | Create/edit/cancel flows; job roles + materials + tasks tabs; employee picker (offboarding/migration); blocked period check; signature generator; IT responsibility check; role-based field visibility |

## Layout Components (`components/layout/`)

| Component | Type | Features |
|-----------|------|----------|
| **Navbar** | Navigation bar | Session-aware; theme toggle + notification bell + language switcher; SSE status indicator (Wifi/WifiOff); admin link for HR_ADMIN; logo from system settings |
| **NotificationBell** | Notification UI | SSE-subscribed (`notification:new`, `task:*`); unread badge; mark read / mark all; click-through navigation |
| **LanguageSwitcher** | Locale control | Toggle NL/FR; POST `/api/user/locale` + cookie; `useRouter` refresh |

## Provider Components (`components/providers/`)

| Component | Type | Features |
|-----------|------|----------|
| **SSEProvider** | Context provider | `EventSource('/api/sse')`; reconnect with exponential backoff; synthetic events on reconnect; pattern matching (`*`, `prefix:*`); `useSSE(pattern, handler)` and `useSSEStatus()` hooks |

## Starters Components (`components/starters/`)

| Component | Type | Features |
|-----------|------|----------|
| **StartersTable** | Data table | Year/custom date range; sortable columns; search + entity + type filters; CSV/PDF/XLSX export; pending-boarding block (HR_ADMIN); experience column |

## Task Components (`components/tasks/`)

| Component | Type | Features |
|-----------|------|----------|
| **TaskCard** | Display card | Priority badge; deadline/completed display; status icon; click to open detail |
| **TaskDetailDialog** | Detail dialog | Admin reassignment via Select; complete task; link to calendar with starterId; status icon |
| **TaskStatusIcon** | Icon utility | Lucide icons by status (completed, in progress, blocked, cancelled, default) |

## UI Primitives (`components/ui/`)

Built on **Radix UI** with `class-variance-authority` for variant management and `cn()` for class merging.

| Component | Radix Base | Variants |
|-----------|-----------|----------|
| **Alert** | — | default, destructive |
| **Badge** | — | default, secondary, destructive, outline |
| **Button** | Slot | default, destructive, outline, secondary, ghost, link × default, sm, lg, icon |
| **Card** | — | — (composition: Header, Footer, Title, Description, Content) |
| **Checkbox** | @radix-ui/react-checkbox | — |
| **Dialog** | @radix-ui/react-dialog | — (composition: Trigger, Content, Header, Footer, Title, Description) |
| **DropdownMenu** | @radix-ui/react-dropdown-menu | — (full composition) |
| **Input** | — | — |
| **Label** | @radix-ui/react-label | — |
| **Popover** | @radix-ui/react-popover | — |
| **Select** | @radix-ui/react-select | — (full composition) |
| **Switch** | @radix-ui/react-switch | — |
| **Tabs** | @radix-ui/react-tabs | — |
| **Textarea** | — | — |
| **ExportDropdown** | DropdownMenu | onExportCSV, onExportPDF, onExportXLS callbacks |

## Root Components

| Component | Type | Features |
|-----------|------|----------|
| **SignatureGeneratorDialog** | Feature dialog | Loads HTML template from API; placeholder substitution; copy to clipboard |
| **SignatureBuilder** | Form builder | Visual email signature builder; tabs, components, social links; generates HTML |
| **ThemeToggle** | Preference toggle | next-themes; light/dark; hydration-safe |

## Cross-Cutting Patterns

| Pattern | Components Using It |
|---------|-------------------|
| **SSE subscription** | CalendarView, MyTasks, NotificationBell, Navbar (status) |
| **next-intl translations** | All feature components (37 i18n namespaces) |
| **next-auth session** | Navbar, CalendarView, StarterDialog, StartersTable, MyTasks, RecentStarters |
| **Export (CSV/PDF/XLSX)** | CalendarView, StartersTable |
| **Recharts** | MonthlyCharts, EntityMonthlyCharts, KpiDashboard |
| **Radix Dialog** | StarterDialog, TaskDetailDialog, SignatureGeneratorDialog, all admin dialogs |
| **date-fns locale** | CalendarView, RecentStarters, StartersTable, StarterCard |
