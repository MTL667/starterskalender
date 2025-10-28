import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { graph, isGraphConfigured } from "@/lib/graph";
import { checkRoomAvailability, formatGraphDate } from "@/lib/availability";
import { z } from "zod";
import { addMinutes, format } from "date-fns";

const BookingSchema = z.object({
  roomId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  attendeeEmails: z.array(z.string().email()).default([]),
  externalEmail: z.string().email().optional(),
});

/**
 * POST /api/bookings
 * Create a new booking
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const parsed = BookingSchema.parse(data);

    // Fetch room
    const room = await prisma.room.findUnique({
      where: { id: parsed.roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.active) {
      return NextResponse.json({ error: "Room is not active" }, { status: 400 });
    }

    // Parse dates
    const start = new Date(parsed.start);
    const end = new Date(parsed.end);

    // Validate time range
    if (start >= end) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Validate booking is in the future
    if (start < new Date()) {
      return NextResponse.json(
        { error: "Cannot book in the past" },
        { status: 400 }
      );
    }

    // Check for local overlaps
    const existingBooking = await prisma.booking.findFirst({
      where: {
        roomId: room.id,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        OR: [
          {
            AND: [
              { start: { lte: start } },
              { end: { gt: start } },
            ],
          },
          {
            AND: [
              { start: { lt: end } },
              { end: { gte: end } },
            ],
          },
          {
            AND: [
              { start: { gte: start } },
              { end: { lte: end } },
            ],
          },
        ],
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        { error: "Time slot is already booked" },
        { status: 409 }
      );
    }

    // Check Microsoft Graph availability if configured
    if (isGraphConfigured() && room.msResourceEmail) {
      try {
        const formattedStart = formatGraphDate(start);
        const formattedEnd = formatGraphDate(end);
        
        const isAvailable = await checkRoomAvailability(
          room.msResourceEmail,
          formattedStart,
          formattedEnd
        );

        if (!isAvailable) {
          return NextResponse.json(
            { error: "Room is not available at this time" },
            { status: 409 }
          );
        }
      } catch (error) {
        console.error("Error checking Graph availability:", error);
        // Continue with booking if Graph check fails
      }
    }

    // Create booking in database
    const booking = await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: session.user.id,
        title: parsed.title,
        description: parsed.description,
        start,
        end,
        status: "PENDING",
        externalEmail: parsed.externalEmail,
        createdBy: session.user.id,
      },
    });

    // Sync to Microsoft Graph if configured
    let msEventId: string | undefined;
    let msICalUid: string | undefined;

    if (isGraphConfigured() && room.msResourceEmail) {
      try {
        const g = await graph();
        const formattedStart = formatGraphDate(start);
        const formattedEnd = formatGraphDate(end);

        const graphEvent = await g
          .api(`/users/${encodeURIComponent(room.msResourceEmail!)}/events`)
          .post({
            subject: parsed.title,
            body: {
              contentType: "HTML",
              content: parsed.description || "",
            },
            start: {
              dateTime: formattedStart,
              timeZone: "Europe/Brussels",
            },
            end: {
              dateTime: formattedEnd,
              timeZone: "Europe/Brussels",
            },
            attendees: parsed.attendeeEmails.map((email) => ({
              emailAddress: { address: email },
              type: "required",
            })),
            allowNewTimeProposals: false,
            isOnlineMeeting: true,
            onlineMeetingProvider: "teamsForBusiness",
            location: {
              displayName: room.name,
            },
          });

        msEventId = graphEvent.id;
        msICalUid = graphEvent.iCalUId;

        // Update booking with Graph event info
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            msEventId,
            msICalUid,
          },
        });
      } catch (error) {
        console.error("Error syncing booking to Graph:", error);
        
        // Update booking as confirmed even if Graph sync fails
        // (room is still reserved in our system)
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
          },
        });
      }
    } else {
      // Mark as confirmed if Graph is not configured
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
        },
      });
    }

    // Fetch complete booking with relations
    const completeBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log audit trail
    const { createAuditLog } = await import("@/lib/audit");
    await createAuditLog({
      actorId: session.user.id,
      action: "BOOKING_CREATED",
      target: `Booking:${booking.id}`,
      meta: {
        roomId: room.id,
        roomName: room.name,
        start: start.toISOString(),
        end: end.toISOString(),
        msEventId,
      },
    });

    return NextResponse.json({ booking: completeBooking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings
 * List user's own bookings
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const roomId = searchParams.get("roomId");

    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (roomId) {
      where.roomId = roomId;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
      },
      orderBy: {
        start: "asc",
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}

