// NEXT_PUBLIC_INSTRUCTOR_EMAIL can hold one address or several comma-separated
// ones, so every booking/cancellation/pass/merch notification can reach more
// than one person (e.g. both the studio owner and an admin).
export function instructorEmails(): string[] {
  return process.env.NEXT_PUBLIC_INSTRUCTOR_EMAIL!
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}
