// Local calendar date as YYYY-MM-DD. Never use `.toISOString().split("T")[0]`
// for "today" — that converts to UTC first, which silently rolls the date
// back a day for part of the evening in timezones ahead of UTC (e.g. AEST).
export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayLocal(): string {
  return toLocalDateStr(new Date());
}

// class_date/class_time store Sydney wall-clock time with no timezone
// offset. The server runs in UTC, so parsing that string directly (e.g.
// `new Date(`${date}T${time}`)`) silently misreads it as UTC — a 7pm Sydney
// class becomes 7pm UTC, 10-11 hours later than reality. This converts the
// Sydney wall-clock time to the correct UTC instant, using Sydney's actual
// offset for that specific date (handles DST).
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}
export function sydneyDateTimeToUTC(dateStr: string, timeStr: string): Date {
  const guess = new Date(`${dateStr}T${timeStr}Z`);
  const offsetMs = getTimezoneOffsetMs(guess, "Australia/Sydney");
  return new Date(guess.getTime() - offsetMs);
}
