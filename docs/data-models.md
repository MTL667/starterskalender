# Data Models

> Generated: 2026-04-08 | Scan level: deep | Source: `prisma/schema.prisma`

## Overview

The database layer uses **Prisma 5** with **PostgreSQL**. The schema defines **20 models** and **10 enums**, organized around core business domains: identity, organization, starters, task management, notifications, bookings, and system configuration.

Schema synchronization uses `prisma db push` (not formal migrations) with custom idempotent SQL scripts in `migrations/` for data transformations.

## Enums

| Enum | Values | Purpose |
|------|--------|---------|
| `Role` | HR_ADMIN, ENTITY_EDITOR, ENTITY_VIEWER, GLOBAL_VIEWER, NONE | RBAC roles |
| `IdentityProvider` | MICROSOFT, MANUAL | Auth provider type |
| `UserStatus` | INVITED, ACTIVE, SUSPENDED | User lifecycle |
| `StarterType` | ONBOARDING, OFFBOARDING, MIGRATION | Starter workflow type |
| `TaskType` | IT_SETUP, HR_ADMIN, FACILITIES, MANAGER_ACTION, CUSTOM | Task category |
| `TaskStatus` | PENDING, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED | Task lifecycle |
| `TaskPriority` | LOW, MEDIUM, HIGH, URGENT | Task urgency |
| `NotificationType` | WEEKLY_REMINDER, MONTHLY_SUMMARY, QUARTERLY_SUMMARY, YEARLY_SUMMARY | Digest types |
| `NotificationChannelType` | IN_APP, EMAIL, BOTH | Notification delivery |
| `BookingStatus` | PENDING, CONFIRMED, CANCELLED | Room booking lifecycle |

## Entity Relationship Diagram (Textual)

```
User ──< Membership >── Entity
  │                        │
  │                        ├──< Starter (StarterEntity)
  │                        ├──< Starter (StarterFromEntity) [migration source]
  │                        ├──< JobRole ──< JobRoleMaterial >── Material
  │                        ├──< BlockedPeriod
  │                        ├──< NotificationPreference
  │                        ├──< Task
  │                        ├──< TaskAssignment
  │                        └──  SignatureTemplate (1:1)
  │
  ├──< Task (assignee)
  ├──< Task (creator)
  ├──< Task (completer)
  ├──< TaskAssignment
  ├──< Notification
  ├──< Booking
  └──< AuditLog

Starter ──< StarterMaterial >── Material
Starter ──< Task

Room ──< Booking

EmailTemplate (standalone)
EmailLog (standalone)
SystemSettings (standalone)
AllowedTenant (standalone)
```

## Models

### Identity & Access

#### User
Core user model with Azure AD integration and RBAC.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, cuid | Unique identifier |
| email | String | unique | Login email |
| password | String? | — | Optional legacy auth |
| name | String? | — | Display name |
| role | Role | default NONE | RBAC role |
| identityProvider | IdentityProvider | default MANUAL | Auth source |
| status | UserStatus | default INVITED | Account state |
| locale | String | default "nl" | UI language preference |
| tenantId | String? | indexed | Azure AD tenant ID |
| oid | String? | indexed | Azure AD object ID |
| twoFASecret | String? | — | TOTP secret |
| twoFAEnabled | Boolean | default false | 2FA active |
| lastLoginAt | DateTime? | — | Last successful login |

**Relations**: memberships, notificationPreferences, bookings, assignedTasks, createdTasks, completedTasks, taskAssignments, notifications, auditLogs

#### AllowedTenant
Azure AD tenant allowlist for SSO access control.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, cuid | — |
| tenantId | String | unique | Azure AD Tenant ID |
| tenantName | String | — | Organization display name |
| domain | String? | — | Primary domain |
| isActive | Boolean | default true | Active flag |
| notes | String? | text | Admin notes |

### Organization

#### Entity
Organizational unit (legal entity / business unit).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, cuid | — |
| name | String | unique | Entity name |
| colorHex | String | — | Badge/card color |
| isActive | Boolean | default true | Active flag |
| notifyEmails | String[] | — | Legacy reminder recipients |

**Relations**: memberships, starters (entity + from), jobRoles, blockedPeriods, notificationPreferences, tasks, taskAssignments, signatureTemplate

#### Membership
User ↔ Entity access mapping.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| userId | String | FK → User | — |
| entityId | String | FK → Entity | — |
| canEdit | Boolean | default false | Editor vs viewer |

**Unique**: (userId, entityId)

### Starters

#### Starter
Employee onboarding/offboarding/migration record.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, cuid | — |
| type | StarterType | default ONBOARDING | Workflow type |
| entityId | String? | FK → Entity | Target entity |
| fromEntityId | String? | FK → Entity | Source entity (migration) |
| firstName | String | not null | First name |
| lastName | String | not null | Last name |
| language | String | default "NL" | Starter's language |
| region | String? | — | Region |
| roleTitle | String? | — | Job title |
| fromRoleTitle | String? | — | Source role (migration) |
| via | String? | — | Referral channel |
| notes | String? | text | Extra information |
| phoneNumber | String? | — | Contact phone |
| desiredEmail | String? | — | Desired email address |
| contractSignedOn | DateTime? | default now | Contract signing date |
| startDate | DateTime? | — | Start/departure date |
| weekNumber | Int? | — | ISO week (derived) |
| year | Int? | — | Year |
| isPendingBoarding | Boolean | default false | Date not yet known |
| isCancelled | Boolean | default false | Cancelled flag |
| cancelledAt | DateTime? | — | Cancellation timestamp |
| cancelledBy | String? | — | Who cancelled |
| cancelReason | String? | text | Cancellation reason |
| hasExperience | Boolean | default false | Prior experience |
| experienceSince | DateTime? | — | Experience start |
| experienceRole | String? | — | Experience job title |
| experienceEntity | String? | — | Experience company |

**Relations**: entity, fromEntity, starterMaterials, tasks

**Indexes**: type, (year, startDate), (entityId, year), fromEntityId, (weekNumber, year), isCancelled, isPendingBoarding

#### StarterMaterial
Material tracking per starter (equipment, access, etc.).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| starterId | String | FK → Starter | — |
| materialId | String | FK → Material | — |
| isProvided | Boolean | default false | Delivered flag |
| providedAt | DateTime? | — | Delivery timestamp |
| providedBy | String? | — | Who provided |
| notes | String? | text | Notes |

**Unique**: (starterId, materialId)

### Materials & Job Roles

#### Material
Equipment/access/software item catalog.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| name | String | unique | Material name |
| description | String? | text | Description |
| category | String? | — | Category (Hardware, Software, Access) |
| isActive | Boolean | default true | Active flag |
| order | Int | default 0 | Sort order |

#### JobRole
Job function within an entity.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| entityId | String | FK → Entity | — |
| title | String | — | Job title |
| description | String? | text | Description |
| isActive | Boolean | default true | Active flag |
| order | Int | default 0 | Sort order |

**Unique**: (entityId, title)

#### JobRoleMaterial
Required materials per job role.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| jobRoleId | String | FK → JobRole | — |
| materialId | String | FK → Material | — |
| isRequired | Boolean | default true | Required vs optional |
| notes | String? | text | Extra notes |

**Unique**: (jobRoleId, materialId)

### Task Management

#### Task
Individual task instance.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| type | TaskType | — | Task category |
| title | String | — | Task title |
| description | String? | text | Description |
| status | TaskStatus | default PENDING | Current status |
| priority | TaskPriority | default MEDIUM | Priority level |
| starterId | String? | FK → Starter | Linked starter |
| entityId | String? | FK → Entity | Linked entity |
| assignedToId | String? | FK → User | Assignee |
| dueDate | DateTime? | — | Deadline |
| completedAt | DateTime? | — | Completion time |
| completedById | String? | FK → User | Who completed |
| completionNotes | String? | text | Completion notes |
| blockedReason | String? | text | Block reason |
| templateId | String? | — | Source template ID |

**Indexes**: (status, assignedToId), (starterId, status), (entityId, status), (assignedToId, dueDate), (type, status), dueDate

#### TaskTemplate
Template for automatic task creation on new starters.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| type | TaskType | — | Task category |
| title | String | — | Title (supports `{{variables}}`) |
| description | String? | text | Description (supports variables) |
| priority | TaskPriority | default MEDIUM | Default priority |
| daysUntilDue | Int | default 7 | Days from startDate to deadline |
| isActive | Boolean | default true | Active flag |
| autoAssign | Boolean | default true | Auto-assign on new starter |
| forEntityIds | String[] | — | Entity filter (empty = all) |
| forJobRoleTitles | String[] | — | Job role filter (empty = all) |
| forStarterType | StarterType? | — | Starter type filter (null = all) |

#### TaskAssignment
Default task assignee per entity and task type.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| entityId | String? | FK → Entity | null = global default |
| taskType | TaskType | — | Task category |
| assignedToId | String | FK → User | Default assignee |
| notifyChannel | NotificationChannelType | default BOTH | Notification method |

**Unique**: (entityId, taskType)

### Notifications

#### Notification
In-app notification bell items.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| userId | String | FK → User | Recipient |
| type | String | — | TASK_ASSIGNED, TASK_DUE_SOON, etc. |
| title | String | — | Notification title |
| message | String | text | Body text |
| taskId | String? | — | Linked task |
| starterId | String? | — | Linked starter |
| linkUrl | String? | — | Navigation URL |
| isRead | Boolean | default false | Read flag |
| readAt | DateTime? | — | Read timestamp |

#### NotificationPreference
Per-user, per-entity digest preferences.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| userId | String | FK → User | — |
| entityId | String | FK → Entity | — |
| weeklyReminder | Boolean | default true | Weekly digest toggle |
| monthlySummary | Boolean | default true | Monthly digest toggle |
| quarterlySummary | Boolean | default true | Quarterly digest toggle |
| yearlySummary | Boolean | default true | Yearly digest toggle |

**Unique**: (userId, entityId)

#### EmailTemplate
Customizable email templates for digest notifications.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| type | NotificationType | unique | Template type |
| subject | String | — | Subject with variables |
| body | String | text | HTML body with variables |
| isActive | Boolean | default true | Active flag |
| description | String? | text | Variable documentation |

#### EmailLog
Email delivery audit trail.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| type | NotificationType | — | Digest type |
| recipient | String | — | Email address |
| subject | String | — | Email subject |
| status | String | default "SENT" | SENT, FAILED, BOUNCED |
| errorMessage | String? | text | Error details |
| metadata | Json? | — | Extra data (task IDs, etc.) |

### Rooms & Bookings

#### Room
Meeting room with optional MS Graph resource mailbox.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| name | String | — | Room name |
| capacity | Int | — | Seating capacity |
| location | String? | — | Physical location |
| msResourceEmail | String? | — | MS Graph resource email |
| hourlyRateCents | Int | default 0 | Rental rate |
| active | Boolean | default true | Available flag |

#### Booking
Room reservation with optional MS Graph sync.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| roomId | String | FK → Room | — |
| userId | String? | FK → User | Booker |
| externalEmail | String? | — | External booker email |
| title | String | — | Meeting title |
| start | DateTime | — | Start time |
| end | DateTime | — | End time |
| status | BookingStatus | default PENDING | Booking state |
| msEventId | String? | — | Graph event ID |
| msICalUid | String? | — | Idempotency key |

### System

#### SystemSettings
Key-value system configuration (branding, etc.).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| key | String | unique | Setting key (e.g., "logo_url") |
| value | String? | text | Setting value |

#### SignatureTemplate
Email signature HTML template per entity.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| entityId | String | unique, FK → Entity | One per entity |
| name | String | — | Template name |
| htmlTemplate | String | text | HTML with placeholders |
| isActive | Boolean | default true | Active flag |

#### AuditLog
Immutable audit trail for all mutations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| actorId | String? | FK → User | Who performed action |
| action | String | indexed | Action type |
| target | String? | — | Target description |
| meta | Json? | — | Additional metadata |

**Indexes**: actorId, action, createdAt

## Custom SQL Migrations

| File | Purpose | Strategy |
|------|---------|----------|
| `migrations/fix-contractSignedOn.sql` | Fix NULL `contractSignedOn` values | Idempotent — checks column state |
| `migrations/split-starter-name.sql` | Split `name` → `firstName` + `lastName` | Idempotent — checks if `name` column exists |

These run in `start.sh` **before** `prisma db push` to transform existing data before schema enforcement.
