export function getKolkataDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;
  return `${year}-${month}-${day}`;
}

export function getKolkataTimeString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
}

export function parseKolkataDate(dateStr: string, timeStr: string = "00:00:00"): Date {
  // Construct a date in Asia/Kolkata by specifying the date/time string with the offset.
  // First, find the current offset for Kolkata (+05:30 or +5.5 hours)
  const isoString = `${dateStr}T${timeStr}+05:30`;
  return new Date(isoString);
}

export function getDaysInMonth(year: number, month: number): string[] {
  // month is 1-indexed (1 = January, 12 = December)
  const numDays = new Date(year, month, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= numDays; d++) {
    const dayStr = String(d).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    days.push(`${year}-${monthStr}-${dayStr}`);
  }
  return days;
}

export function calculateDurationMinutes(start: Date | null | undefined, end: Date | null | undefined): number {
  if (!start || !end) return 0;
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / (1000 * 60));
}
