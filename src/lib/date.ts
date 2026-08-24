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

// class_date/class_time store the studio's local wall-clock time with no
// timezone offset. The server runs in UTC, so parsing that string directly
// (e.g. `new Date(`${date}T${time}`)`) silently misreads it as UTC — a 7pm
// local class gets treated as 7pm UTC, hours later than reality. Hardcoded
// to Australia/Sydney since every VIA studio so far is Sydney/Melbourne
// (same offset); if a future client is in another timezone, change the
// string below.
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}
export function studioDateTimeToUTC(dateStr: string, timeStr: string): Date {
  const guess = new Date(`${dateStr}T${timeStr}Z`);
  const offsetMs = getTimezoneOffsetMs(guess, "Australia/Sydney");
  return new Date(guess.getTime() - offsetMs);
}
