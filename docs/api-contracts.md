# API Contracts

> Generated: 2026-04-08 | Scan level: deep | 63 route files scanned

## Authentication Legend

| Auth Level | Description |
|------------|-------------|
| **None** | Public endpoint, no authentication required |
| **Session** | Requires authenticated session (NextAuth JWT) |
| **Session + RBAC** | Session + role/entity membership checks |
| **HR_ADMIN** | Requires `role === 'HR_ADMIN'` |
| **CRON_SECRET** | `Authorization: Bearer {CRON_SECRET}` header |

## Health & System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Liveness probe — always returns `{ status: "ok" }` |
| GET | `/api/health/ready` | None | Readiness probe — verifies DB connection + env presence |
| GET | `/api/system/settings` | None | Public key/value settings (branding, logo URL) |
| GET | `/api/setup/check` | Session | Returns `needsSetup` (zero entities) + `isAdmin` flag |
| GET | `/api/uploads/[...path]` | None | Static file serving from `public/uploads/` |

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth | Sign-in, callback, session, CSRF endpoints |

## Real-Time

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sse` | Session | Server-Sent Events stream; entity-scoped channels; heartbeat |

## Starters

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/starters` | Session + RBAC | List starters (year, entityId, search, type, includePending filters) |
| POST | `/api/starters` | Session + canMutateStarter | Create starter; auto-creates tasks; emits SSE |
| GET | `/api/starters/:id` | Session | Get single starter with relations |
| PATCH | `/api/starters/:id` | Session + canMutateStarter | Update starter; activating pending sets tasks + materials |
| DELETE | `/api/starters/:id` | Session + canMutateStarter | Delete starter + audit + SSE |
| POST | `/api/starters/:id/cancel` | HR_ADMIN or entity editor | Cancel starter; sends notification emails |
| GET | `/api/starters/:id/materials` | Session | List starter's assigned materials |
| POST | `/api/starters/:id/materials` | Session | Assign job role materials to starter |
| PATCH | `/api/starters/:id/materials/:materialId` | Session | Update material status (provided/notes) |
| POST | `/api/starters/:id/regenerate-tasks` | HR_ADMIN | Delete auto tasks and recreate from templates |
| GET | `/api/starters/employees` | Session + RBAC | Distinct onboarded/migrated employees for pickers |

## Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tasks` | Session + scope | List tasks (status, assignedToMe, starterId, entityId, type) |
| POST | `/api/tasks` | Session | Create task; non-admin requires entity membership |
| GET | `/api/tasks/:id` | Session | Get task (admin, assignee, or entity member) |
| PATCH | `/api/tasks/:id` | Session | Update task; reassignment triggers email + SSE |
| DELETE | `/api/tasks/:id` | Session | Delete task (admin or creator) |
| POST | `/api/tasks/:id/complete` | Session | Complete task (assignee or HR_ADMIN); notifies creator |

## Entities

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/entities` | Session | List entities visible to user (RBAC-filtered) |
| POST | `/api/entities` | HR_ADMIN | Create entity (name, colorHex, notifyEmails) |
| PATCH | `/api/entities/:id` | HR_ADMIN | Update entity |
| DELETE | `/api/entities/:id` | HR_ADMIN | Delete entity |

## Job Roles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/job-roles` | Session | List job roles (entityId, withMaterialCount) |
| POST | `/api/job-roles` | HR_ADMIN | Create job role |
| PATCH | `/api/job-roles/:id` | HR_ADMIN | Update job role |
| DELETE | `/api/job-roles/:id` | HR_ADMIN | Delete job role |
| GET | `/api/job-roles/:id/materials` | HR_ADMIN | Materials linked to job role |
| POST | `/api/job-roles/:id/materials` | HR_ADMIN | Link material to job role |
| PATCH | `/api/job-roles/:id/materials/:materialId` | HR_ADMIN | Update link (required/notes) |
| DELETE | `/api/job-roles/:id/materials/:materialId` | HR_ADMIN | Remove material link |

## Materials

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/materials` | HR_ADMIN | List materials with usage counts |
| POST | `/api/materials` | HR_ADMIN | Create material |
| PATCH | `/api/materials/:id` | HR_ADMIN | Update material |
| DELETE | `/api/materials/:id` | HR_ADMIN | Delete (blocked if in use) |

## Blocked Periods

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/blocked-periods` | HR_ADMIN | List active blocked periods |
| POST | `/api/blocked-periods` | HR_ADMIN | Create blocked period |
| PUT | `/api/blocked-periods` | Session | Check if date is blocked for entity/role |
| PATCH | `/api/blocked-periods/:id` | HR_ADMIN | Update blocked period |
| DELETE | `/api/blocked-periods/:id` | HR_ADMIN | Delete blocked period |

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Session | Current user's notifications (unreadOnly, limit) |
| POST | `/api/notifications` | Session | Create notification for a user |
| POST | `/api/notifications/:id/read` | Session | Mark notification as read (must own) |
| POST | `/api/notifications/mark-all-read` | Session | Mark all unread as read |

## Signature Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/signature-templates` | HR_ADMIN | List templates (entityId filter) |
| POST | `/api/signature-templates` | HR_ADMIN | Create (one per entity, 409 if exists) |
| GET | `/api/signature-templates/:id` | HR_ADMIN | Get template |
| PATCH | `/api/signature-templates/:id` | HR_ADMIN | Update template |
| DELETE | `/api/signature-templates/:id` | HR_ADMIN | Delete template |

## Statistics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stats/ytd` | Session | Year-to-date starter counts per entity |
| GET | `/api/stats/kpi` | HR_ADMIN | KPI metrics: task completion, lead time, material coverage, trends |

## Task Assignments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/task-assignments/check-responsibility` | Session | Check if user is assignee for task type/entity |

## User Preferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/user/locale` | Partial | Set locale cookie + optional DB update |
| GET | `/api/user/notification-preferences` | Session | Get notification preferences (auto-creates defaults) |
| PATCH | `/api/user/notification-preferences` | Session | Upsert preferences for entity |

## Admin APIs

### User Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users` | HR_ADMIN | List users with memberships |
| POST | `/api/admin/users` | HR_ADMIN | Create user with hashed password |
| PATCH | `/api/admin/users/:id` | HR_ADMIN | Update user role/name |
| DELETE | `/api/admin/users/:id` | HR_ADMIN | Delete user (cannot delete self) |
| GET | `/api/admin/users/:id/memberships` | HR_ADMIN | List memberships |
| POST | `/api/admin/users/:id/memberships` | HR_ADMIN | Add membership |
| DELETE | `/api/admin/users/:id/memberships` | HR_ADMIN | Remove membership |
| GET | `/api/admin/users/:id/notification-preferences` | HR_ADMIN | Get user's notification prefs |
| PATCH | `/api/admin/users/:id/notification-preferences` | HR_ADMIN | Bulk upsert prefs |

### Tenant Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/allowed-tenants` | HR_ADMIN | List allowed Azure AD tenants |
| POST | `/api/admin/allowed-tenants` | HR_ADMIN | Add tenant (duplicate → 400) |
| PATCH | `/api/admin/allowed-tenants/:id` | HR_ADMIN | Update tenant |
| DELETE | `/api/admin/allowed-tenants/:id` | HR_ADMIN | Delete tenant |

### Email & Cron

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/email-templates` | HR_ADMIN | List email templates |
| POST | `/api/admin/email-templates` | HR_ADMIN | Create template |
| GET | `/api/admin/email-templates/:id` | HR_ADMIN | Get template |
| PATCH | `/api/admin/email-templates/:id` | HR_ADMIN | Update template |
| DELETE | `/api/admin/email-templates/:id` | HR_ADMIN | Delete template |
| GET | `/api/admin/email-logs` | HR_ADMIN | Email send logs |
| GET | `/api/admin/mail-config` | HR_ADMIN | Mail configuration status |
| POST | `/api/admin/mail-test` | HR_ADMIN | Send test email |
| POST | `/api/admin/cron-preview` | HR_ADMIN | Preview digest recipients |
| GET | `/api/admin/cron-diagnostics` | HR_ADMIN | Cron environment diagnostics |
| POST | `/api/admin/trigger-cron` | HR_ADMIN | Manually trigger cron endpoint |

### Task Assignments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/task-assignments` | HR_ADMIN | List all task assignments |
| POST | `/api/admin/task-assignments` | HR_ADMIN | Create/update assignment |
| DELETE | `/api/admin/task-assignments/:id` | HR_ADMIN | Delete assignment |
| GET | `/api/admin/task-diagnostics` | HR_ADMIN | Template/assignment diagnostics |

### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/api/admin/system/settings` | HR_ADMIN | Upsert system setting |
| POST | `/api/admin/system/logo` | HR_ADMIN | Upload logo (max 2MB multipart) |
| DELETE | `/api/admin/system/logo` | HR_ADMIN | Clear logo |
| GET | `/api/admin/audit-logs` | HR_ADMIN | Paginated audit logs with filters |
| GET | `/api/admin/material-matrix` | HR_ADMIN | Material × job role matrix |

## Cron Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cron/email-reminder` | CRON_SECRET | Run weekly email reminder job |
| GET | `/api/cron/send-weekly-reminders` | CRON_SECRET | Remind about starters starting in 7 days |
| GET | `/api/cron/send-monthly-summary` | CRON_SECRET | Monthly digest email |
| GET | `/api/cron/send-quarterly-summary` | CRON_SECRET | Quarterly digest email |
| GET | `/api/cron/send-yearly-summary` | CRON_SECRET | Yearly digest email |

## Common Patterns

- **Zod Validation**: All POST/PATCH endpoints use Zod schemas for request body validation
- **Audit Logging**: All mutations log to `AuditLog` via `createAuditLog()`
- **SSE Events**: Starter and task mutations emit events via `eventBus.emit()`
- **RBAC Filtering**: List endpoints filter results by user's entity memberships
- **Error Format**: `{ error: "message" }` with appropriate HTTP status codes
