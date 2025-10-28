import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { graph } from "@/lib/graph";

export async function GET() {
  try {
    // Fetch local rooms
    const rooms = await prisma.room.findMany({
      where: { active: true },
      include: {
        bookings: {
          where: {
            status: "CONFIRMED",
            end: { gte: new Date() },
          },
        },
      },
    });

    // Optionally sync with Microsoft Graph
    try {
      const g = await graph();
      const msRooms = await g.api("/places/microsoft.graph.room").get();
      
      // Merge or sync logic here if needed
    } catch (error) {
      console.error("Failed to fetch from Graph:", error);
      // Continue with local data
    }

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

