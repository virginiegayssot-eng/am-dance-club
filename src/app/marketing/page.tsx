"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import ReviewRequestPanel from "@/components/ReviewRequestPanel";
import ReviewsCarouselPanel from "@/components/ReviewsCarouselPanel";
import MerchPanel from "@/components/MerchPanel";
import DiscountsPanel from "@/components/DiscountsPanel";
import { Cake, PartyPopper, Calendar } from "lucide-react";

type StudentRow = { id: string; full_name: string | null; email: string; phone: string | null; birth_date: string | null };
type SegmentKey = "no_pass" | "inactive_3w" | "all";

export default function MarketingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"reviews" | "carousel" | "merch" | "discounts" | "birthdays" | "broadcast" | "reminders">("reviews");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [activePassStudentIds, setActivePassStudentIds] = useState<Set<string>>(new Set());
  const [lastBookingByStudent, setLastBookingByStudent] = useState<Map<string, string>>(new Map());

  const [reminderSettings, setReminderSettings] = useState<{ booking_reminders_enabled: boolean; winback_reminders_enabled: boolean; birthday_reminders_enabled: boolean } | null>(null);
  const [savingReminderSetting, setSavingReminderSetting] = useState<"booking" | "winback" | "birthday" | null>(null);

  const [segmentFilter, setSegmentFilter] = useState<SegmentKey>("no_pass");
  const [selectedBroadcastIds, setSelectedBroadcastIds] = useState<Set<string>>(new Set());
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState<number | null>(null);
  const [broadcastErrors, setBroadcastErrors] = useState<string[]>([]);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data: prof } = await supabase.from("profiles").select("role, is_admin").eq("id", user.id).single();
    if (prof?.role !== "instructor") { router.push("/dashboard"); return; }
    setIsAdmin(!!prof?.is_admin);
    if (prof?.is_admin) loadReminderSettings();
    await loadData();
  }

  async function loadReminderSettings() {
    const { data } = await supabase.from("reminder_settings").select("booking_reminders_enabled, winback_reminders_enabled, birthday_reminders_enabled").eq("id", 1).single();
    if (data) setReminderSettings(data);
  }

  async function toggleReminderSetting(key: "booking_reminders_enabled" | "winback_reminders_enabled" | "birthday_reminders_enabled") {
    if (!reminderSettings) return;
    const next = !reminderSettings[key];
    setSavingReminderSetting(key === "booking_reminders_enabled" ? "booking" : key === "winback_reminders_enabled" ? "winback" : "birthday");
    const { error } = await supabase.from("reminder_settings").update({ [key]: next, updated_at: new Date().toISOString() }).eq("id", 1);
    setSavingReminderSetting(null);
    if (!error) setReminderSettings(s => s ? { ...s, [key]: next } : s);
  }

  async function loadData() {
    const { data: profs } = await supabase
      .from("profiles").select("id, full_name, email, phone, birth_date")
      .eq("role", "student").order("full_name");
    setStudents(profs ?? []);

    const { data: passes } = await supabase.from("passes").select("student_id, classes_remaining, expires_at");
    const active = new Set(
      (passes ?? [])
        .filter(p => p.classes_remaining > 0 && (!p.expires_at || new Date(p.expires_at) > new Date()))
        .map(p => p.student_id)
    );
    setActivePassStudentIds(active);

    const { data: regs } = await supabase
      .from("registrations")
      .select("student_id, classes(class_date)")
      .eq("status", "confirmed");
    const lastBooking = new Map<string, string>();
    (regs ?? []).forEach((r: any) => {
      const d = r.classes?.class_date;
      if (!d) return;
      const prev = lastBooking.get(r.student_id);
      if (!prev || d > prev) lastBooking.set(r.student_id, d);
    });
    setLastBookingByStudent(lastBooking);

    setLoading(false);
  }

  function daysAgoStr(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  const segments: Record<SegmentKey, StudentRow[]> = {
    no_pass: students.filter(s => !activePassStudentIds.has(s.id)),
    inactive_3w: students.filter(s => {
      const last = lastBookingByStudent.get(s.id);
      return !last || last < daysAgoStr(21);
    }),
    all: students,
  };
  const segmentLabels: Record<SegmentKey, string> = {
    no_pass: "No active pass",
    inactive_3w: "Hasn't booked in 3+ weeks",
    all: "All members",
  };
  const currentSegment = segments[segmentFilter];

  function selectAllInSegment() {
    setSelectedBroadcastIds(new Set(currentSegment.map(s => s.id)));
  }
  function toggleBroadcastRecipient(id: string) {
    setSelectedBroadcastIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function sendBroadcast() {
    if (selectedBroadcastIds.size === 0 || !broadcastSubject.trim() || !broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    const res = await fetch("/api/instructor/broadcast-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: Array.from(selectedBroadcastIds), subject: broadcastSubject, message: broadcastMessage }),
    });
    const data = await res.json();
    setBroadcastSent(data.sent ?? 0);
    setBroadcastErrors(data.errors ?? []);
    setSendingBroadcast(false);
  }

  const upcomingBirthdays = students
    .filter(s => s.birth_date)
    .map(s => {
      const bd = new Date(s.birth_date!);
      const now = new Date();
      // Compare at midnight, not the current moment — otherwise anyone
      // whose birthday is today gets treated as "already passed" the
      // instant it's past midnight, rolling them all the way to next
      // year instead of showing daysUntil = 0.
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
      const next = thisYear < today ? new Date(now.getFullYear() + 1, bd.getMonth(), bd.getDate()) : thisYear;
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
      return { ...s, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 20);

  const tabs = [
    { key: "reviews", label: "Review Requests" },
    { key: "carousel", label: "Reviews" },
    { key: "merch", label: "Merch" },
    { key: "discounts", label: "Discounts" },
    { key: "birthdays", label: "Birthdays" },
    { key: "broadcast", label: "Message a Segment" },
    ...(isAdmin ? [{ key: "reminders", label: "Reminders" }] as const : []),
  ] as const;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff8f3]">
      <div className="font-body text-gray-400">Loading…</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Instructor</p>
          <h1 className="section-title">Marketing</h1>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto mb-8 border-b border-gray-200">
          <div className="flex gap-1 w-max">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`font-body text-sm px-4 py-2.5 -mb-px border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-[#2041d8] text-[#2041d8]"
                    : "border-transparent text-gray-500 hover:text-black"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* REVIEW REQUESTS TAB */}
        {activeTab === "reviews" && (
          <div className="max-w-xl">
            <p className="font-body text-sm text-gray-500 mb-4">
              Ask members to leave a review — first-timers from a specific class, or anyone you pick. The same tool is also on your Dashboard right after marking attendance, if that's more convenient in the moment.
            </p>
            <ReviewRequestPanel />
          </div>
        )}

        {/* REVIEWS CAROUSEL TAB */}
        {activeTab === "carousel" && <ReviewsCarouselPanel />}

        {/* MERCH TAB */}
        {activeTab === "merch" && <MerchPanel />}

        {/* DISCOUNTS TAB */}
        {activeTab === "discounts" && <DiscountsPanel />}

        {/* BIRTHDAYS TAB */}
        {activeTab === "birthdays" && (
          <div>
            <p className="font-body text-sm text-gray-500 mb-6">
              {upcomingBirthdays.length} member{upcomingBirthdays.length !== 1 ? "s" : ""} with birthdays on record
            </p>

            {upcomingBirthdays.length === 0 ? (
              <div className="card p-10 text-center">
                <Cake className="w-10 h-10 mx-auto mb-3 text-[#2041d8]" strokeWidth={1.5} />
                <p className="font-body text-gray-400">No birthdays on record yet. Encourage members to add their birth date in their profile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {upcomingBirthdays.map(s => {
                  const isThisWeek = s.daysUntil <= 7;
                  const isToday = s.daysUntil === 0;
                  return (
                    <div
                      key={s.id}
                      className={`card p-5 ${
                        isToday
                          ? "bg-[#2041d8]"
                          : isThisWeek
                          ? "bg-white ring-1 ring-[#2041d8]/25"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0">
                          <p className={`font-heading text-sm truncate ${isToday ? "text-white" : ""}`}>{s.full_name ?? s.email}</p>
                          {s.phone && <p className={`font-body text-xs mt-0.5 truncate ${isToday ? "text-white/70" : "text-gray-400"}`}>{s.phone}</p>}
                        </div>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isToday ? "bg-white/15" : isThisWeek ? "bg-[#2041d8]/10" : ""
                        }`}>
                          {isToday ? (
                            <PartyPopper className="w-5 h-5 text-white" strokeWidth={1.75} />
                          ) : isThisWeek ? (
                            <Cake className="w-5 h-5 text-[#2041d8]" strokeWidth={1.75} />
                          ) : (
                            <Calendar className="w-5 h-5 text-gray-300" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                      <p className={`font-body text-xs ${isToday ? "text-white/80" : "text-gray-500"}`}>
                        {new Date(s.birth_date!).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
                      </p>
                      <div className="mt-2">
                        {isToday ? (
                          <span className="inline-flex items-center bg-white text-[#2041d8] font-heading text-xs px-2.5 py-1 rounded-full">
                            🎂 Today!
                          </span>
                        ) : isThisWeek ? (
                          <span className="inline-flex items-center bg-[#2041d8] text-white font-heading text-xs px-2.5 py-1 rounded-full">
                            In {s.daysUntil} day{s.daysUntil !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="font-heading text-sm text-gray-400">
                            In {s.daysUntil} days
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/chat?dm=${s.id}`}
                        className={`mt-3 font-body text-xs hover:underline block ${isToday ? "text-white" : "text-[#2041d8]"}`}
                      >
                        Send birthday message →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MESSAGE A SEGMENT TAB */}
        {activeTab === "broadcast" && (
          <div className="max-w-xl space-y-5">
            <p className="font-body text-sm text-gray-500">
              Send a one-off email to a filtered group — a promo, a new-class announcement, a check-in. For automatic recurring nudges, see the Reminders tab instead.
            </p>

            <div>
              <label className="label">Who</label>
              <select
                className="input"
                value={segmentFilter}
                onChange={e => { setSegmentFilter(e.target.value as SegmentKey); setBroadcastSent(null); setBroadcastErrors([]); setSelectedBroadcastIds(new Set(segments[e.target.value as SegmentKey].map(s => s.id))); }}
              >
                {(Object.keys(segmentLabels) as SegmentKey[]).map(key => (
                  <option key={key} value={key}>{segmentLabels[key]} ({segments[key].length})</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Recipients ({selectedBroadcastIds.size} selected)</label>
                <button type="button" onClick={selectAllInSegment} className="font-body text-xs text-[#2041d8] hover:underline">Select all</button>
              </div>
              {currentSegment.length === 0 ? (
                <p className="font-body text-sm text-gray-400">No members match this filter.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-3">
                  {currentSegment.map(s => (
                    <label key={s.id} className="flex items-center gap-2 font-body text-sm">
                      <input type="checkbox" checked={selectedBroadcastIds.has(s.id)} onChange={() => toggleBroadcastRecipient(s.id)} />
                      <span>{s.full_name ?? s.email}</span>
                      <span className="text-xs text-gray-400">{s.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                placeholder="e.g. New classes just added!"
                value={broadcastSubject}
                onChange={e => setBroadcastSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input resize-none"
                rows={5}
                placeholder="What do you want to tell them?"
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
              />
            </div>

            {broadcastSent !== null && (
              <div className="space-y-1">
                <p className="font-body text-sm text-green-600">
                  {broadcastSent === 0 ? "No emails sent." : `${broadcastSent} email${broadcastSent !== 1 ? "s" : ""} sent successfully.`}
                </p>
                {broadcastErrors.length > 0 && (
                  <p className="font-body text-sm text-red-500">{broadcastErrors.length} failed: {broadcastErrors.join("; ")}</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={sendBroadcast}
              disabled={sendingBroadcast || selectedBroadcastIds.size === 0 || !broadcastSubject.trim() || !broadcastMessage.trim()}
              className="btn-primary w-full justify-center"
            >
              {sendingBroadcast ? "Sending…" : `Send to ${selectedBroadcastIds.size}`}
            </button>
          </div>
        )}

        {/* REMINDERS TAB */}
        {activeTab === "reminders" && (
          <div className="max-w-xl space-y-4">
            <p className="font-body text-sm text-gray-500 mb-2">
              Automatic reminder emails (and push notifications, where enabled) sent to members. Turning one off pauses it immediately — no need to touch the schedule.
            </p>

            {reminderSettings === null ? (
              <div className="card p-6 text-center font-body text-sm text-gray-400">Loading…</div>
            ) : (
              <>
                <div className="card p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-heading text-sm">Booking reminders</p>
                    <p className="font-body text-xs text-gray-500 mt-0.5">Sent ~12 hours before a class to everyone booked in.</p>
                  </div>
                  <button
                    onClick={() => toggleReminderSetting("booking_reminders_enabled")}
                    disabled={savingReminderSetting === "booking"}
                    className={`relative inline-flex items-center appearance-none border-0 p-0 w-12 h-7 rounded-full shrink-0 transition-colors ${reminderSettings.booking_reminders_enabled ? "bg-[#2041d8]" : "bg-gray-300"} disabled:opacity-50`}
                  >
                    <span className={`absolute left-1 w-5 h-5 rounded-full bg-white transition-transform ${reminderSettings.booking_reminders_enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="card p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-heading text-sm">Win-back emails</p>
                    <p className="font-body text-xs text-gray-500 mt-0.5">Sent daily to members who haven't attended in 3+ weeks.</p>
                  </div>
                  <button
                    onClick={() => toggleReminderSetting("winback_reminders_enabled")}
                    disabled={savingReminderSetting === "winback"}
                    className={`relative inline-flex items-center appearance-none border-0 p-0 w-12 h-7 rounded-full shrink-0 transition-colors ${reminderSettings.winback_reminders_enabled ? "bg-[#2041d8]" : "bg-gray-300"} disabled:opacity-50`}
                  >
                    <span className={`absolute left-1 w-5 h-5 rounded-full bg-white transition-transform ${reminderSettings.winback_reminders_enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="card p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-heading text-sm">Birthday emails</p>
                    <p className="font-body text-xs text-gray-500 mt-0.5">Sent automatically to a member on their birthday.</p>
                  </div>
                  <button
                    onClick={() => toggleReminderSetting("birthday_reminders_enabled")}
                    disabled={savingReminderSetting === "birthday"}
                    className={`relative inline-flex items-center appearance-none border-0 p-0 w-12 h-7 rounded-full shrink-0 transition-colors ${reminderSettings.birthday_reminders_enabled ? "bg-[#2041d8]" : "bg-gray-300"} disabled:opacity-50`}
                  >
                    <span className={`absolute left-1 w-5 h-5 rounded-full bg-white transition-transform ${reminderSettings.birthday_reminders_enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
