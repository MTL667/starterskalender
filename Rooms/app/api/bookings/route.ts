import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { graph } from "@/lib/graph";

const BookingSchema = z.object({
  roomId: z.string(),
  title: z.string().min(3),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  attendeeEmails: z.array(z.string().email()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const parsed = BookingSchema.parse(data);

    const room = await prisma.room.findUnique({ where: { id: parsed.roomId } });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.msResourceEmail) {
      return NextResponse.json({ error: "Room not linked to MS resource" }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for overlapping bookings
    const overlaps = await prisma.booking.findFirst({
      where: {
        roomId: room.id,
        status: "CONFIRMED",
        OR: [
          {
            AND: [
              { start: { lte: new Date(parsed.end) } },
              { end: { gte: new Date(parsed.start) } },
            ],
          },
        ],
      },
    });

    if (overlaps) {
      return NextResponse.json({ error: "Time slot already booked" }, { status: 409 });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: user.id,
        title: parsed.title,
        description: parsed.description,
        start: new Date(parsed.start),
        end: new Date(parsed.end),
        status: "PENDING",
      },
    });

    // Push to Graph
    try {
      const g = await graph();
      const event = await g.api(`/users/${encodeURIComponent(room.msResourceEmail)}/events`).post({
        subject: parsed.title,
        body: { contentType: "HTML", content: parsed.description || "" },
        start: { dateTime: parsed.start, timeZone: "Europe/Brussels" },
        end: { dateTime: parsed.end, timeZone: "Europe/Brussels" },
        attendees: parsed.attendeeEmails.map((e) => ({
          emailAddress: { address: e },
          type: "required",
        })),
        location: { displayName: room.name },
        allowNewTimeProposals: false,
      });

      // Update with event details
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          msEventId: event.id,
          msICalUid: event.iCalUId,
        },
      });

      return NextResponse.json({ ok: true, booking });
    } catch (error) {
      // Rollback on Graph failure
      await prisma.booking.delete({ where: { id: booking.id } });
      console.error("Failed to create Graph event:", error);
      return NextResponse.json({ error: "Failed to create booking in calendar" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

