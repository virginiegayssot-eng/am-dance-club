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
