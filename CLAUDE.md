# Conventions

## Wide content on mobile

Never wrap a `<table>` (or any content that can exceed the viewport width — wide flex rows, long unbroken text) in a container that only has `overflow-hidden`. That clips anything past the edge with no way to scroll to it — the content silently becomes inaccessible on mobile instead of erroring.

If the outer wrapper needs `overflow-hidden` to clip rounded corners (the `card` class), nest the scrollable content in its own `overflow-x-auto` div:

```tsx
<div className="card overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm font-body">
      ...
    </table>
  </div>
</div>
```

Check this whenever adding a new `<table>` or wide row of content — test it at a narrow (375px) viewport width before considering it done.

## Never use window.confirm() / alert() / prompt()

This app is installed as a standalone PWA (`manifest.json` has `display: standalone`). Native browser dialogs — `confirm()`, `alert()`, `prompt()` — are unreliable in iOS's standalone WKWebView and can silently no-op instead of showing anything. Since destructive actions are almost always gated with `if (!confirm(...)) return`, the no-op makes the button look completely broken on an iOS home-screen install — the exact bug that hit every delete/cancel action in the instructor dashboard.

Always use `src/components/ConfirmDialog.tsx` for confirmations instead:

```tsx
const [confirmDialog, setConfirmDialog] = useState<{ message: string; confirmLabel?: string; action: () => void } | null>(null);

function deleteThing(id: string) {
  setConfirmDialog({
    message: "Delete this? This cannot be undone.",
    action: async () => {
      await supabase.from("things").delete().eq("id", id);
      loadData();
    },
  });
}

// in JSX:
{confirmDialog && (
  <ConfirmDialog
    message={confirmDialog.message}
    confirmLabel={confirmDialog.confirmLabel}
    onCancel={() => setConfirmDialog(null)}
    onConfirm={() => { const action = confirmDialog.action; setConfirmDialog(null); action(); }}
  />
)}
```

For non-destructive error/info messages, prefer inline UI state (an error banner, a toast) over `alert()` for the same reason — it hasn't caused a reported bug yet since it's not delete-blocking, but it's the same underlying risk.

## Timezone-sensitive date math

`class_date` and `class_time` are stored as the studio's local wall-clock time with no timezone offset (e.g. `"19:00:00"` for a 7pm class). The server (Netlify Functions) runs in UTC. Constructing a `Date` directly from those columns — `new Date(`${class_date}T${class_time}`)` — gets silently parsed as if `class_time` were already UTC, not Sydney time. A 7pm class becomes "7pm UTC", 10-11 hours later than reality.

This is invisible for anything that only *displays* the date (`new Date(class_date + "T00:00:00").toLocaleDateString(...)` is fine — no time-of-day math involved). It's a real bug only when the result feeds a genuine elapsed/remaining-time calculation against `Date.now()`. That happened once already: `src/app/api/bookings/cancel/route.ts` compared `classDateTime` to now to decide whether a cancellation was inside the 24-hour refund window, and the 10-hour skew let cancellations well inside the real window slip through as refundable.

Whenever you add logic that needs "how many hours until/since this class," convert with the studio's real timezone instead of parsing the raw string:

```ts
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}
function studioDateTimeToUTC(dateStr: string, timeStr: string): Date {
  const guess = new Date(`${dateStr}T${timeStr}Z`);
  const offsetMs = getTimezoneOffsetMs(guess, "Australia/Sydney");
  return new Date(guess.getTime() - offsetMs);
}
```

This also handles daylight saving correctly, since it looks up the real offset for that specific date rather than hardcoding +10 or +11. Every VIA studio so far is Sydney/Melbourne (same offset) — swap the timezone string if a future client is elsewhere.

## Toggle switches (on/off pills)

A toggle built as a `<button>` track with an absolutely-positioned `<span>` knob needs an *explicit* base position — `left-1` plus `translate-x-N` for the "on" delta — never just `top-1` (or nothing) plus a bare `translate-x-N` off an implicit `left: auto`. Relying on the browser's static-position resolution for an absolutely positioned lone child renders inconsistently — a real bug: THE A.M's Reports > Settings reminder toggles rendered as a stray floating circle next to the pill instead of a clean sliding knob. Also add `appearance-none border-0 p-0` to the `<button>` itself — an unstyled `<button>` can pick up native OS chrome that fights the custom fill. Working recipe:

```tsx
<button className={`relative inline-flex items-center appearance-none border-0 p-0 w-12 h-7 rounded-full ${on ? "bg-[#accent]" : "bg-gray-300"}`}>
  <span className={`absolute left-1 w-5 h-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
</button>
```

## Async form handlers need try/catch/finally

A `set...Loading(true)` at the top of an async submit handler with no matching `finally` leaves the button stuck (e.g. "Creating…" forever, requiring a page reload) the moment anything throws before the normal success/error branches — including something as ordinary as a non-null assertion (`profile!.id`) firing because `profile` hadn't finished loading yet. Real bug: THE A.M's "New Class" form did exactly this. Wrap the body:

```ts
async function submit() {
  setLoading(true);
  setError("");
  try {
    // ...validation, the actual request...
    if (error) throw new Error(error.message);
    // ...success side effects...
  } catch (err: any) {
    setError(err?.message ?? "Something went wrong — please try again.");
  } finally {
    setLoading(false);
  }
}
```

so any failure — expected or not — always resets the UI and shows a message instead of hanging silently. None of the existing form handlers in `instructor/page.tsx` do this yet; add it to any you touch, don't feel obligated to retrofit ones you aren't already changing.

## Wide flex rows on mobile (tab bars, filter chips)

Same root problem as the "Wide content on mobile" table rule above, different shape: a tab/filter row with several buttons and no `overflow-x-auto` doesn't wrap — it silently overflows and drags the *whole page* into horizontal scroll, cutting content off on both edges. Real bug: Reports' 5-tab row (Revenue/Attendance/Members/Birthdays/Settings) did this on a phone once the Settings tab was added. Wrap it the same way the table rule does:

```tsx
<div className="overflow-x-auto mb-8 border-b border-gray-200">
  <div className="flex gap-1 w-max">
    {tabs.map(tab => <button key={tab.key} className="whitespace-nowrap ...">{tab.label}</button>)}
  </div>
</div>
```

## Admin tier (`is_admin`)

Not every client has this column — it started on BYLA (multi-instructor: Majo is owner/admin, Lucha and Luji are regular instructors) and was later added to THE A.M ahead of hiring a second instructor. `role` stays `'instructor'` for everyone; `is_admin` only gates admin-exclusive UI (e.g. Marketing > Reminders, who can delete/reassign classes). Before writing code that reads `profile.is_admin` on a given client, check whether `supabase/add-admin-flag.sql` (or equivalent) actually exists and has been run there — it hasn't on Manea or `template`/`demo` yet.

## Automatic reminders feature

Built first on THE A.M (`main`), then on `template`: booking reminders (email + push, ~12h before a confirmed class, to registered students only), win-back emails (members inactive 3+ weeks), birthday emails (added 27 Aug, `main` only so far — sent same-day, matched on `birth_date`'s month/day in Sydney time since the year on that column is just a signup placeholder), and automatic first-timer review-request emails (added 27 Aug, `main` only — asks a student for a Google review the morning after their *first ever* attended class; "first-timer" for a given `attendance` row means the student has no other `attended = true` row, mirroring the existing manual review-candidates check exactly, just run daily instead of on-demand). All four run behind a Supabase `pg_cron` schedule hitting `/api/reminders/booking`, `/api/reminders/winback`, `/api/reminders/birthday`, and `/api/reminders/review-request`, each gated by a `CRON_SECRET` header check, and a `reminder_settings` singleton row toggleable per-type from Marketing > Reminders (admin-only, so needs the `is_admin` column above first — see "Marketing section" below, this used to live on Reports > Settings but moved). Not yet on BYLA or Manea — planned next. When porting:

- **The email copy itself needs a rewrite per client, not a straight copy-paste.** All four templates live in `src/lib/reminder-email.ts` (three of them) and `src/lib/review-email.ts` (the review request), and are currently written in THE A.M's voice specifically — "the dance floor," "Ginny" as the sign-off, `@theamdance` as the Instagram handle, THE A.M's blue/pink color pair. BYLA (urban/reggaeton, black brand, Majo as the instructor-facing name) and Manea (beginner-friendly/confidence-building tone, burgundy brand, Manea herself signs off) each need their own copy in the same voice as their existing member-facing text (compare BYLA's homepage testimonial copy, Manea's instructor bio in `instructor-bios-seed.sql`) — don't just reuse "dance floor" or "Ginny" on either. The *structure* (header band, message, signature, footer band with a CTA) is the reusable part; the words and sign-off aren't.
- **The review-request email specifically is not just a copy change on BYLA — it asks for a different thing.** THE A.M and Manea both point at a real Google Business review link (`GOOGLE_REVIEW_URL`) and say so explicitly ("leave me a Google review"). BYLA's review flow is the in-app one instead (`/api/reviews/submit`, landing in the homepage carousel via `ReviewsCarouselPanel`/`reviews.status = 'pending'`) — its email needs to ask for a "normal" review submitted in the app, not a Google review, and must not link to a Google review URL that doesn't represent what actually happens there. Confirm which kind of review each new client actually wants before writing that one template.
- The manual review-request tools (`ReviewRequestPanel` — "First-timers by class" and "Any members") are unaffected by the automatic version above and keep working exactly as before; the automatic job is an additional path for the specific first-timer case, not a replacement.
- Birthday and booking-reminder emails end with a compact footer band (colored background, a short line + a small button, table-layout not flex for email-client compatibility) rather than a bare ending — win-back's footer is different in kind (it's the only one stating a recurring day/time, not a CTA) and shouldn't be collapsed into the same pattern. Get the client's actual Instagram handle and any next-step CTA (book a class, etc.) before writing a new client's footer.
- Avoid em dashes in email copy — flagged during THE A.M's build as not matching the desired tone; write around them (a period, or restructure the sentence) rather than swapping in an en dash or other punctuation.
- Push notification infra doesn't exist on `template` or `demo` yet — only `main`, `byla`, and Manea have it (`push_subscriptions` table, `src/lib/push-admin.ts`, `/api/push/*`). Email (Resend) exists on every client already, so it's the one channel that always works; push is a bonus where the infra is present.
- Reuse the Sydney-time conversion helper (see "Timezone-sensitive date math" above) for the "is this class ~12 hours out" check — don't re-derive it inline like the cancel route once did.
- `sendPushToAll` broadcasts to everyone; reminders need a targeted send to specific student IDs only — add a `sendPushToStudents(studentIds, payload)` variant rather than reusing `sendPushToAll` with a workaround.
- The two Supabase extensions (`pg_cron`, `pg_net`) and the cron jobs themselves are enabled via plain SQL in a migration file — no special dashboard toggle, just the usual paste-and-run in the Supabase SQL editor, same as every other migration. Make each `create policy`/`cron.schedule` block idempotent (a `drop policy if exists` right before every `create policy`) — a partial first run followed by a retry is the normal case, not the exception.
- Give each client's cron jobs their own `CRON_SECRET` (don't reuse THE A.M's) and set it in that client's Netlify env vars.
- Same-day date-math bug to watch for: comparing a birthday (or any annual/recurring date) against `new Date()` directly instead of a midnight-normalized "today" silently rolls anyone whose event is *today* forward by a year, since midnight-of-today is always earlier than "right now." This exact bug hid Marketing > Birthdays' same-day entries — see "Timezone-sensitive date math" above for the general pattern; the fix here was normalizing both sides to midnight before comparing, not just the one side.

## Marketing section (`/marketing`)

Reminder settings started out on Reports > Settings but that's the wrong home — Reports is analytics, reminders/reviews/outreach are marketing actions. They now live on their own `/marketing` page (linked in Navbar next to Reports, visible to any instructor), with a `reminders` tab that's admin-only same as before. Built on `template` first, then ported to THE A.M (`main`) — port this page (and the Navbar link) alongside the reminders feature itself when porting to a new client, don't leave reminder settings sitting on Reports there.

Seven tabs (THE A.M; `template` still has the original four — Merch/Discounts/Reviews-carousel move hasn't been ported there yet): **Review Requests** (the existing first-timers/any-member review-email tool, pulled out into `src/components/ReviewRequestPanel.tsx` so it can be used both here and from its original spot on the instructor dashboard's quick-action button after marking attendance — deliberately left as two separate mounts of the same component rather than threading it through the dashboard's much larger page state), **Reviews** (homepage testimonial-carousel management — approve/add/delete — in `src/components/ReviewsCarouselPanel.tsx`; distinct from Review Requests, which only sends request emails), **Merch** (`src/components/MerchPanel.tsx`) and **Discounts** (`src/components/DiscountsPanel.tsx`), **Birthdays** (moved off Reports, same upcoming-birthdays calc), **Message a Segment** (new: pick a filter — no active pass / inactive 3+ weeks / all members — then send a one-off email via `/api/instructor/broadcast-email`; this is the manual, one-time counterpart to win-back's automatic recurring nudge, no new DB table needed since it doesn't dedupe or reschedule), and **Reminders** (the toggle pair, admin-only).

Merch, Discounts, and the Reviews carousel used to be tabs on the instructor Dashboard (`instructor/page.tsx`) — moved out because they're marketing actions, not day-to-day class-running ones. Each was extracted into its own self-contained panel component (own `useEffect` fetch, own state, own `<Modal>`/`<ConfirmDialog>`) rather than refactored in place, same reasoning as `ReviewRequestPanel`: `instructor/page.tsx` is large, live, and hard to browser-test, so a clean lift-and-shift into an isolated component is lower risk than threading three more features through its shared state. `src/components/Modal.tsx` is a shared copy of the modal shell used by these three panels — `instructor/page.tsx` keeps its own local `Modal` function for its remaining forms untouched, so don't try to consolidate the two into one without checking every remaining caller in that file. The Dashboard got a "Marketing" entry-point card (links to `/marketing`) where those tabs used to be, and the "Send Review Emails" quick-action button stayed on the Dashboard as-is.
