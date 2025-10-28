import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { graph, isGraphConfigured } from "@/lib/graph";

/**
 * GET /api/rooms
 * List all active rooms with their availability status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch rooms from database
    const rooms = await prisma.room.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: "CONFIRMED",
              },
            },
          },
        },
      },
    });

    // If Graph is configured, also fetch from Microsoft
    let msRooms: any[] = [];
    if (isGraphConfigured()) {
      try {
        const g = await graph();
        const response = await g.api("/places/microsoft.graph.room").get();
        msRooms = response.value || [];
      } catch (error) {
        console.error("Error fetching rooms from Graph:", error);
        // Continue without MS rooms
      }
    }

    // Merge local rooms with Graph rooms (prefer local)
    const roomMap = new Map();
    
    // Add local rooms
    rooms.forEach((room) => {
      roomMap.set(room.msResourceEmail || room.id, {
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        location: room.location,
        msResourceEmail: room.msResourceEmail,
        hourlyRateCents: room.hourlyRateCents,
        active: room.active,
        bookingCount: room._count.bookings,
        source: "local",
      });
    });

    // Add MS rooms that aren't in local database
    msRooms.forEach((msRoom: any) => {
      const email = msRoom.emailAddress;
      if (email && !roomMap.has(email)) {
        roomMap.set(email, {
          id: email,
          name: msRoom.displayName,
          capacity: msRoom.capacity || 0,
          location: msRoom.address?.street || null,
          msResourceEmail: email,
          hourlyRateCents: 0,
          active: true,
          bookingCount: 0,
          source: "graph",
        });
      }
    });

    return NextResponse.json({
      rooms: Array.from(roomMap.values()),
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

