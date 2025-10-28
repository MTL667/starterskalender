# Room Booking System - Setup Guide

This guide explains how to set up and use the Room Booking system integrated with Microsoft 365.

## Overview

The Room Booking system allows users to:
- View available meeting rooms
- Book time slots with Microsoft Graph synchronization
- Manage bookings (view, update, cancel)
- Administrators can manage rooms and view all bookings

### Key Features

- **Microsoft Graph Integration**: Bookings are synced to Microsoft 365 resource calendars
- **Real-time Availability**: Checks both local database and Microsoft Graph for availability
- **Role-based Access**: Different permissions for admins vs regular users
- **Audit Trail**: All booking actions are logged

## Architecture

### Database Models

**Room**
- `id`: Unique identifier
- `name`: Room name (e.g., "Conference Room A")
- `capacity`: Maximum number of people
- `location`: Building/floor location
- `msResourceEmail`: Microsoft resource mailbox email (for Graph sync)
- `hourlyRateCents`: Rental rate in cents (e.g., 500 = €5.00)
- `active`: Whether the room is available for booking

**Booking**
- `id`: Unique identifier
- `roomId`: Reference to room
- `userId`: Reference to user
- `title`: Booking title/subject
- `description`: Optional description
- `start`: Start datetime
- `end`: End datetime
- `status`: PENDING, CONFIRMED, or CANCELLED
- `msEventId`: Microsoft Graph event ID
- `msICalUid`: iCal UID for idempotency

## Prerequisites

1. **PostgreSQL Database**: Running and accessible
2. **Microsoft 365 Account**:
   - Azure AD App Registration
   - Resource mailboxes created in Exchange Online
   - Graph API permissions configured
3. **Environment Variables**: Configured (see below)

## Azure AD Setup

### 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - Name: `Room Booking System`
   - Supported account types: Single tenant
   - Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
5. Click **Register**

### 2. Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Application permissions**
3. Add these permissions:
   - `Calendars.ReadWrite` - Required to create/update bookings
   - `MailboxSettings.Read` - To read calendar settings
   - `Place.Read.All` - To list available rooms (optional)
4. Click **Add permissions**
5. Click **Grant admin consent** for your tenant

### 3. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description and expiration
4. **Copy the secret value immediately** (you won't see it again)

### 4. Configure Redirect URIs

Add these redirect URIs (for both local and production):
- `http://localhost:3000/api/auth/callback/azure-ad`
- `https://your-domain.com/api/auth/callback/azure-ad`

### 5. Create Resource Mailboxes

1. Go to [Microsoft 365 Admin Center](https://admin.microsoft.com)
2. Navigate to **Resources** → **Rooms & equipment**
3. Click **Add resource**
4. Fill in room details and assign an email address (e.g., `room-a@yourcompany.com`)
5. Repeat for each room

## Environment Variables

Add these to your `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rooms

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here

# Microsoft Graph
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your-client-secret-here
```

Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

## Database Migration

Run Prisma migrations to create the new tables:

```bash
npm run db:migrate
```

This creates:
- `Room` table
- `Booking` table
- Adds `bookings` relation to `User` table
- Adds necessary indexes

## Setup Rooms

### Option 1: Via Admin Interface

1. Log in as admin
2. Navigate to **Admin** → **Zalen & Vergaderruimtes**
3. Click **Add Room**
4. Fill in details:
   - **Name**: Room name
   - **Capacity**: Maximum people
   - **Location**: Building/floor (optional)
   - **Microsoft Resource Email**: The resource mailbox email
   - **Hourly Rate**: In cents (e.g., 500 for €5.00)
   - **Active**: Check to enable booking

### Option 2: Via API

```bash
curl -X POST http://localhost:3000/api/admin/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Conference Room A",
    "capacity": 20,
    "location": "Building 1, Floor 3",
    "msResourceEmail": "room-a@yourcompany.com",
    "hourlyRateCents": 1000,
    "active": true
  }'
```

## API Endpoints

### User Endpoints

**GET `/api/rooms`** - List all active rooms
- Returns: Array of rooms with availability info

**POST `/api/bookings`** - Create a booking
- Body:
```json
{
  "roomId": "room-id",
  "title": "Team Meeting",
  "description": "Quarterly planning",
  "start": "2024-01-15T10:00:00Z",
  "end": "2024-01-15T11:00:00Z",
  "attendeeEmails": ["user@example.com"],
  "externalEmail": "external@example.com"
}
```

**GET `/api/bookings`** - List user's bookings
- Query params: `?status=CONFIRMED&roomId=room-id`

**GET `/api/bookings/[id]`** - Get specific booking

**PATCH `/api/bookings/[id]`** - Update booking
- Only updates fields provided in body

**DELETE `/api/bookings/[id]`** - Cancel booking

### Admin Endpoints

**GET `/api/admin/rooms`** - List all rooms (with stats)

**POST `/api/admin/rooms`** - Create room

**PATCH `/api/admin/rooms/[id]`** - Update room

**DELETE `/api/admin/rooms/[id]`** - Delete room

## Microsoft Graph Integration

### How It Works

1. **Booking Creation**:
   - Check local database for conflicts
   - Check Microsoft Graph for availability
   - Create booking in database (PENDING)
   - Create event in resource mailbox via Graph
   - Update booking status to CONFIRMED

2. **Booking Updates**:
   - Update local database
   - Sync changes to Graph event

3. **Booking Cancellation**:
   - Mark as CANCELLED in database
   - Delete event from Graph

### Graph API Calls Used

- **`POST /places/microsoft.graph.room`** - List available rooms
- **`POST /me/calendar/getSchedule`** - Check availability
- **`POST /users/{email}/events`** - Create booking event
- **`PATCH /users/{email}/events/{id}`** - Update booking event
- **`DELETE /users/{email}/events/{id}`** - Cancel booking event

## Usage Examples

### Booking a Room

```typescript
const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    roomId: 'room-id',
    title: 'Weekly Team Standup',
    start: '2024-01-15T14:00:00Z',
    end: '2024-01-15T14:30:00Z',
    attendeeEmails: ['colleague@company.com'],
  }),
});

const { booking } = await response.json();
```

### Checking Availability

The availability check happens automatically when booking, but you can query manually:

```typescript
import { getRoomAvailability } from '@/lib/availability';

const availability = await getRoomAvailability(
  ['room@company.com'],
  '2024-01-15T14:00:00',
  '2024-01-15T14:30:00'
);
```

## Docker Deployment

### Local Development

```bash
# Start services
docker-compose -f docker-compose.dev.yml up --build

# Access app
open http://localhost:3000

# View emails
open http://localhost:8025  # Mailhog
```

### Production

```bash
# Build image
docker build -f docker/Dockerfile -t room-booking:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e NEXTAUTH_URL=https://your-domain.com \
  -e NEXTAUTH_SECRET=... \
  -e AZURE_TENANT_ID=... \
  -e AZURE_CLIENT_ID=... \
  -e AZURE_CLIENT_SECRET=... \
  room-booking:latest
```

Or use `docker-compose.yml`:

```bash
docker-compose up -d
```

## Troubleshooting

### "No Graph token" Error

- Check that `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` are set
- Verify the client secret hasn't expired
- Ensure Application permissions are granted and admin consent is given

### 403 Forbidden on Event Creation

- Verify `Calendars.ReadWrite` permission is granted
- Ensure the resource mailbox email is correct
- Check that the mailbox is fully provisioned in Exchange Online

### Bookings Not Appearing in Outlook

- Verify `msResourceEmail` matches the resource mailbox email
- Check Graph event was created successfully (look for `msEventId` in booking)
- Manually verify in Exchange Online that the mailbox exists

### Timezone Issues

- All dates in database are stored in UTC
- Microsoft Graph expects Europe/Brussels timezone
- Display times are converted to user's local timezone

## Security Considerations

1. **Authentication**: All endpoints require valid session
2. **Authorization**: Users can only modify their own bookings (admins can modify all)
3. **Rate Limiting**: Consider adding rate limiting for production
4. **Input Validation**: All inputs are validated with Zod schemas
5. **Audit Logging**: All booking actions are logged for compliance

## Future Enhancements

- [ ] Recurring bookings
- [ ] Room booking rules (minimum duration, max advance booking)
- [ ] Email notifications for booking confirmations
- [ ] Integration with Outlook calendar for users
- [ ] Mobile app support
- [ ] QR code check-in
- [ ] No-show detection and auto-release
- [ ] Analytics dashboard for room utilization

## Support

For issues or questions:
1. Check audit logs in `/admin/audit-log`
2. Review application logs
3. Verify Microsoft Graph permissions in Azure Portal
4. Test Graph API directly using [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)

