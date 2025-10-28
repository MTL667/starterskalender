# Room Booking MVP

A Next.js app for managing room bookings that syncs with Microsoft 365 resource calendars.

## Features

- **Dual Authentication**: Microsoft Entra ID for internal staff, magic link + 2FA for external users
- **Privacy Protection**: External users see only BUSY blocks, not internal meeting details
- **MS Graph Sync**: Bookings automatically appear in Outlook/Teams
- **Admin Panel**: Manage rooms, allowed tenants, and users
- **Docker Ready**: Deploy to EasyPanel or any container platform

## Tech Stack

- Next.js 14 (App Router)
- NextAuth (Azure AD + Email providers)
- Prisma + PostgreSQL
- Microsoft Graph SDK
- Docker

## Quick Start

### Development

1. Copy `.env.example` to `.env` and fill in your values
2. Start database and mailhog:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
3. Setup database:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```

### Production (EasyPanel)

1. **Create Azure App Registration**:
   - Register app in Azure Portal
   - Add redirect URI: `https://your-domain.tld/api/auth/callback/azure-ad`
   - Grant API permissions (Application):
     - `Calendars.ReadWrite`
     - `MailboxSettings.Read`
     - `Place.Read.All`
   - Get Admin consent
   - Create client secret

2. **Setup Environment Variables**:
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://your-domain.tld
   NEXTAUTH_SECRET=your-secret
   AZURE_TENANT_ID=...
   AZURE_CLIENT_ID=...
   AZURE_CLIENT_SECRET=...
   EMAIL_SERVER=smtp://...
   EMAIL_FROM=...
   ```

3. **Deploy**:
   - Connect your GitHub repo to EasyPanel
   - Select Dockerfile build
   - Add environment variables
   - Deploy!

## Azure Setup

### Required Permissions

Application permissions (not delegated) are required:
- `Calendars.ReadWrite` - Create/update/delete calendar events
- `MailboxSettings.Read` - Read calendar settings
- `Place.Read.All` - List rooms

### Resource Mailboxes

Create room mailboxes in Exchange Admin:
1. Open Exchange Admin Center
2. Create resource mailboxes (e.g., `room-a@yourdomain.tld`)
3. Add email to Room record in database: `msResourceEmail`

### Allowed Tenants

Only tenants on the allowlist can login:
```sql
INSERT INTO "AllowedTenant" (tenant_id, name, active) 
VALUES ('your-tenant-guid', 'Company Name', true);
```

## Database Schema

- **User**: Roles (ADMIN/STAFF/EXTERNAL), identity provider, 2FA status
- **Room**: Name, capacity, MS resource email
- **Booking**: Links to room/user, sync status with Graph
- **AllowedTenant**: Whitelist of Azure AD tenants

## API Routes

- `GET /api/rooms` - List all available rooms
- `POST /api/bookings` - Create a new booking
- `GET /api/me/bookings` - Get user's bookings
- `GET /api/health` - Health check

## Privacy & Security

- **External users** are masked from internal meeting details
- **Allowed tenants** whitelist prevents unauthorized tenant access
- **2FA** required for manually-created external users
- **Graph sync** ensures Outlook/Teams always reflects reality

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run prisma:migrate  # Create migration
npm run prisma:seed     # Seed database
npm run prisma:studio   # Open Prisma Studio
```

## Docker

```bash
docker compose -f docker-compose.dev.yml up
```

## License

GPL-3.0

