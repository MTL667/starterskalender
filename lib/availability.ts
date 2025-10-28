import { graph, isGraphConfigured } from "@/lib/graph";
import { format } from "date-fns";

const TIMEZONE = "Europe/Brussels";

export interface ScheduleItem {
  status: "free" | "busy" | "tentative" | "oof" | "workingElsewhere";
}

export interface RoomAvailability {
  roomEmail: string;
  scheduleItems: ScheduleItem[];
  workingHours?: {
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
  };
}

/**
 * Get room availability from Microsoft Graph
 * Returns FREE/BUSY status for the specified time range
 */
export async function getRoomAvailability(
  roomEmails: string[],
  start: string,
  end: string
): Promise<RoomAvailability[]> {
  if (!isGraphConfigured()) {
    console.warn("Microsoft Graph not configured - skipping availability check");
    return [];
  }

  try {
    const g = await graph();

    // Prepare schedule request body
    const body = {
      schedules: roomEmails,
      startTime: {
        dateTime: start,
        timeZone: TIMEZONE,
      },
      endTime: {
        dateTime: end,
        timeZone: TIMEZONE,
      },
      availabilityViewInterval: 15, // 15-minute intervals
    };

    // Call Microsoft Graph getSchedule API
    const response = await g.api("/me/calendar/getSchedule").post(body);

    return response.value || [];
  } catch (error) {
    console.error("Error fetching room availability from Graph:", error);
    // Return empty availability on error
    return [];
  }
}

/**
 * Check if a room is available for a specific time range
 */
export async function checkRoomAvailability(
  roomEmail: string,
  start: string,
  end: string
): Promise<boolean> {
  const availability = await getRoomAvailability([roomEmail], start, end);
  
  if (availability.length === 0) {
    // If Graph is not configured or returns empty, assume available
    return true;
  }

  const room = availability[0];
  if (!room.scheduleItems || room.scheduleItems.length === 0) {
    return true;
  }

  // Check if any time slot is busy
  const hasBusySlot = room.scheduleItems.some(
    (item) => item.status === "busy" || item.status === "oof"
  );

  return !hasBusySlot;
}

/**
 * Format date for Microsoft Graph (ISO 8601 with timezone)
 */
export function formatGraphDate(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

