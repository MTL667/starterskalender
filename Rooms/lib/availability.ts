import { graph } from "@/lib/graph";

export interface AvailabilitySlot {
  start: string;
  end: string;
  free: boolean;
}

export async function getRoomAvailability(
  roomEmails: string[],
  start: string,
  end: string
): Promise<AvailabilitySlot[]> {
  const g = await graph();
  const body = {
    schedules: roomEmails,
    startTime: { dateTime: start, timeZone: "Europe/Brussels" },
    endTime: { dateTime: end, timeZone: "Europe/Brussels" },
    availabilityViewInterval: 15,
  };
  
  try {
    const res = await g.api("/me/calendar/getSchedule").post(body);
    const items = res.value?.[0]?.scheduleItems || [];
    
    return items.map((item: any) => ({
      start: item.start?.dateTime || start,
      end: item.end?.dateTime || end,
      free: item.status === "free" || item.status === "free", 
    }));
  } catch (error) {
    console.error("Error fetching availability:", error);
    return [];
  }
}
