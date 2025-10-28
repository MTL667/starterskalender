import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateRoomSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().int().min(1),
  location: z.string().optional(),
  msResourceEmail: z.string().email().optional(),
  hourlyRateCents: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

const UpdateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  location: z.string().optional(),
  msResourceEmail: z.string().email().optional(),
  hourlyRateCents: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/admin/rooms
 * List all rooms (admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "HR_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rooms = await prisma.room.findMany({
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rooms
 * Create a new room (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "HR_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    const parsed = CreateRoomSchema.parse(data);

    const room = await prisma.room.create({
      data: parsed,
    });

    // Log audit trail
    const { createAuditLog } = await import("@/lib/audit");
    await createAuditLog({
      actorId: session.user.id,
      action: "ROOM_CREATED",
      target: `Room:${room.id}`,
      meta: {
        name: room.name,
        capacity: room.capacity,
        msResourceEmail: room.msResourceEmail,
      },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

