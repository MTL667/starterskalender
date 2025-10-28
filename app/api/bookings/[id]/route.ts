import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { graph, isGraphConfigured } from "@/lib/graph";
import { formatGraphDate } from "@/lib/availability";
import { z } from "zod";

const UpdateBookingSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  attendeeEmails: z.array(z.string().email()).optional(),
});

/**
 * GET /api/bookings/[id]
 * Get a specific booking
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
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

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Users can only view their own bookings
    if (booking.userId !== session.user.id && session.user.role !== "HR_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id]
 * Update a booking
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch existing booking
    const existingBooking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { room: true },
    });

    if (!existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check authorization
    if (
      existingBooking.userId !== session.user.id &&
      session.user.role !== "HR_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Cannot update cancelled bookings
    if (existingBooking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot update cancelled booking" },
        { status: 400 }
      );
    }

    const data = await req.json();
    const parsed = UpdateBookingSchema.parse(data);

    // Build update data
    const updateData: any = {};
    let start: Date | undefined;
    let end: Date | undefined;

    if (parsed.title) updateData.title = parsed.title;
    if (parsed.description !== undefined) updateData.description = parsed.description;

    if (parsed.start) {
      start = new Date(parsed.start);
      updateData.start = start;
    } else {
      start = existingBooking.start;
    }

    if (parsed.end) {
      end = new Date(parsed.end);
      updateData.end = end;
    } else {
      end = existingBooking.end;
    }

    // Validate time range
    if (start >= end) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Check for overlaps (excluding this booking)
    if (start !== existingBooking.start || end !== existingBooking.end) {
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          roomId: existingBooking.roomId,
          id: { not: params.id },
          status: { in: ["PENDING", "CONFIRMED"] },
          OR: [
            {
              AND: [{ start: { lte: start } }, { end: { gt: start } }],
            },
            {
              AND: [{ start: { lt: end } }, { end: { gte: end } }],
            },
            {
              AND: [{ start: { gte: start } }, { end: { lte: end } }],
            },
          ],
        },
      });

      if (conflictingBooking) {
        return NextResponse.json(
          { error: "Time slot is already booked" },
          { status: 409 }
        );
      }

      // Check Microsoft Graph availability if configured
      if (
        isGraphConfigured() &&
        existingBooking.room.msResourceEmail &&
        (start !== existingBooking.start || end !== existingBooking.end)
      ) {
        try {
          const formattedStart = formatGraphDate(start);
          const formattedEnd = formatGraphDate(end);

          const { checkRoomAvailability } = await import("@/lib/availability");
          const isAvailable = await checkRoomAvailability(
            existingBooking.room.msResourceEmail,
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
        }
      }
    }

    updateData.updatedBy = session.user.id;

    // Update in database
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
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

    // Sync to Microsoft Graph if configured and booking has MS event
    if (
      isGraphConfigured() &&
      booking.msEventId &&
      existingBooking.room.msResourceEmail
    ) {
      try {
        const g = await graph();
        const formattedStart = formatGraphDate(start);
        const formattedEnd = formatGraphDate(end);

        const graphEvent: any = {};

        if (parsed.title) graphEvent.subject = parsed.title;
        if (parsed.description !== undefined) {
          graphEvent.body = {
            contentType: "HTML",
            content: parsed.description,
          };
        }

        if (parsed.start || parsed.end) {
          graphEvent.start = {
            dateTime: formattedStart,
            timeZone: "Europe/Brussels",
          };
          graphEvent.end = {
            dateTime: formattedEnd,
            timeZone: "Europe/Brussels",
          };
        }

        if (parsed.attendeeEmails) {
          graphEvent.attendees = parsed.attendeeEmails.map((email) => ({
            emailAddress: { address: email },
            type: "required",
          }));
        }

        await g
          .api(
            `/users/${encodeURIComponent(existingBooking.room.msResourceEmail!)}/events/${booking.msEventId}`
          )
          .patch(graphEvent);
      } catch (error) {
        console.error("Error syncing booking update to Graph:", error);
        // Continue even if Graph sync fails
      }
    }

    // Log audit trail
    const { createAuditLog } = await import("@/lib/audit");
    await createAuditLog({
      actorId: session.user.id,
      action: "BOOKING_UPDATED",
      target: `Booking:${booking.id}`,
      meta: {
        roomId: booking.roomId,
        changes: parsed,
      },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings/[id]
 * Cancel a booking
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch existing booking
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { room: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check authorization
    if (
      booking.userId !== session.user.id &&
      session.user.role !== "HR_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Already cancelled
    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Booking already cancelled" }, { status: 400 });
    }

    // Update status to cancelled
    const cancelledBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
        updatedBy: session.user.id,
      },
    });

    // Delete from Microsoft Graph if configured
    if (
      isGraphConfigured() &&
      booking.msEventId &&
      booking.room.msResourceEmail
    ) {
      try {
        const g = await graph();
        await g
          .api(
            `/users/${encodeURIComponent(booking.room.msResourceEmail)}/events/${booking.msEventId}`
          )
          .delete();
      } catch (error) {
        console.error("Error deleting booking from Graph:", error);
        // Continue even if Graph deletion fails
      }
    }

    // Log audit trail
    const { createAuditLog } = await import("@/lib/audit");
    await createAuditLog({
      actorId: session.user.id,
      action: "BOOKING_CANCELLED",
      target: `Booking:${booking.id}`,
      meta: {
        roomId: booking.roomId,
        roomName: booking.room.name,
      },
    });

    return NextResponse.json({ booking: cancelledBooking });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}

