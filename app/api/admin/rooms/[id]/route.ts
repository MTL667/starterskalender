import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  location: z.string().optional(),
  msResourceEmail: z.string().email().optional(),
  hourlyRateCents: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

/**
 * PATCH /api/admin/rooms/[id]
 * Update a room (admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const parsed = UpdateRoomSchema.parse(data);

    const room = await prisma.room.update({
      where: { id: params.id },
      data: parsed,
    });

    // Log audit trail
    const { createAuditLog } = await import("@/lib/audit");
    await createAuditLog({
      actorId: session.user.id,
      action: "ROOM_UPDATED",
      target: `Room:${room.id}`,
      meta: {
        changes: parsed,
      },
    });

    return NextResponse.json({ room });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/rooms/[id]
 * Delete a room (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "HR_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if room has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        roomId: params.id,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete room with active bookings",
          activeBookingsCount: activeBookings,
        },
        { status: 400 }
      );
    }

    await prisma.room.delete({
      where: { id: params.id },
    });

    // Log audit trail
    const { createAuditLog } = await import("@/lib/audit");
    await createAuditLog({
      actorId: session.user.id,
      action: "ROOM_DELETED",
      target: `Room:${params.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}

