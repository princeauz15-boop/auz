import { prisma } from "./prisma";

export interface AttendanceCalculation {
  workingHours: number;
  lateMinutes: number;
  earlyLeaving: number;
  overtime: number;
  isHalfDay: boolean;
  status: string;
}

export async function getCompanySettings() {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({
      data: {
        id: "default",
        companyName: "Smart Attendance Co.",
        officeStartTime: "09:00",
        officeEndTime: "18:00",
        standardWorkHours: 8,
        graceTimeMinutes: 15,
        weeklyOff: "Saturday,Sunday",
        halfDayHours: 4,
      },
    });
  }
  return settings;
}

export function calculateAttendance(
  clockIn: Date,
  clockOut: Date,
  settings: {
    officeStartTime: string;
    officeEndTime: string;
    standardWorkHours: number;
    graceTimeMinutes: number;
    halfDayHours: number;
  }
): AttendanceCalculation {
  // Calculate working hours (handles midnight crossing)
  let workingMs = clockOut.getTime() - clockIn.getTime();
  if (workingMs < 0) {
    // Clock out is next day
    workingMs += 24 * 60 * 60 * 1000;
  }
  const workingHours = workingMs / (1000 * 60 * 60);

  // Parse office start time
  const [startHour, startMin] = settings.officeStartTime.split(":").map(Number);
  const officeStart = new Date(clockIn);
  officeStart.setHours(startHour, startMin, 0, 0);

  // Parse office end time
  const [endHour, endMin] = settings.officeEndTime.split(":").map(Number);
  const officeEnd = new Date(clockIn);
  officeEnd.setHours(endHour, endMin, 0, 0);

  // Calculate late minutes
  const graceDeadline = new Date(officeStart.getTime() + settings.graceTimeMinutes * 60 * 1000);
  let lateMinutes = 0;
  if (clockIn > graceDeadline) {
    lateMinutes = Math.round((clockIn.getTime() - officeStart.getTime()) / (1000 * 60));
  }

  // Calculate early leaving (left before office end)
  let earlyLeaving = 0;
  if (clockOut < officeEnd) {
    earlyLeaving = Math.round((officeEnd.getTime() - clockOut.getTime()) / (1000 * 60));
  }

  // Calculate overtime
  const overtime = Math.max(0, workingHours - settings.standardWorkHours);

  // Determine status
  const isHalfDay = workingHours >= settings.halfDayHours && workingHours < settings.standardWorkHours;
  let status = "present";
  if (workingHours < settings.halfDayHours) {
    status = "absent";
  } else if (isHalfDay) {
    status = "half-day";
  } else if (lateMinutes > 0) {
    status = "late";
  }

  return {
    workingHours: Math.round(workingHours * 100) / 100,
    lateMinutes,
    earlyLeaving,
    overtime: Math.round(overtime * 100) / 100,
    isHalfDay,
    status,
  };
}

export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function isWeekend(date: Date, weeklyOff: string): boolean {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[date.getDay()];
  return weeklyOff.split(",").map((d) => d.trim()).includes(dayName);
}

export async function isHoliday(date: Date): Promise<boolean> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const holiday = await prisma.holiday.findFirst({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
  });
  return !!holiday;
}
