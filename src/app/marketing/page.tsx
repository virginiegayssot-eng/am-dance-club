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
import { MERCH_ENABLED } from "@/lib/feature-flags";
import { Cake, PartyPopper, Calendar, Star, Quote, ShoppingBag, Tag, Send, type LucideIcon } from "lucide-react";

type StudentRow = { id: string; full_name: string | null; email: string; phone: string | null; birth_date: string | null };
type SegmentKey = "no_pass" | "inactive_3w" | "all";

function initials(name: string | null, email: string) {
  const base = (name ?? email).trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function SectionHeader({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-[#000000]/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#000000]" strokeWidth={1.75} />
      </div>
      <div>
        <h2 className="font-heading text-lg mb-0.5">{title}</h2>
        <p className="font-body text-sm text-gray-500 max-w-xl">{description}</p>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"reviews" | "carousel" | "merch" | "discounts" | "birthdays" | "broadcast">("reviews");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [activePassStudentIds, setActivePassStudentIds] = useState<Set<string>>(new Set());
  const [lastBookingByStudent, setLastBookingByStudent] = useState<Map<string, string>>(new Map());

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
    await loadData();
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

  // Merch/Discounts/Reviews carousel and Birthdays were already admin-only
  // on the Dashboard/Reports before this move — kept that way here rather
  // than loosened to every instructor. Review Requests and Message a
  // Segment were already open to everyone (the old header "Send Review
  // Emails" button had no admin check), so they stay that way.
  const tabs = [
    { key: "reviews", label: "Review Requests", icon: Star },
    ...(isAdmin ? [{ key: "carousel", label: "Reviews", icon: Quote }] as const : []),
    ...(isAdmin && MERCH_ENABLED ? [{ key: "merch", label: "Merch", icon: ShoppingBag }] as const : []),
    ...(isAdmin ? [{ key: "discounts", label: "Discounts", icon: Tag }] as const : []),
    ...(isAdmin ? [{ key: "birthdays", label: "Birthdays", icon: Cake }] as const : []),
    { key: "broadcast", label: "Message a Segment", icon: Send },
  ] as const;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#e2d0fb]">
      <div className="font-body text-gray-400">Loading…</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-2">Instructor</p>
          <h1 className="section-title">Marketing</h1>
          <p className="font-body text-sm text-gray-500 mt-2 max-w-xl">Everything for reaching, reviewing, and re-engaging your members lives here.</p>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto mb-10 -mx-1 px-1 border-b border-[#000000]/20">
          <div className="inline-flex items-center gap-1 w-max pb-3">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 font-body text-sm px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    active ? "bg-[#000000] text-white" : "text-gray-500 hover:text-black hover:bg-black/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* REVIEW REQUESTS TAB */}
        {activeTab === "reviews" && (
          <div className="max-w-xl">
            <SectionHeader
              icon={Star}
              title="Review Requests"
              description="Ask members to leave a review: first-timers from a specific class, or anyone you pick. The same tool is also on your Dashboard right after marking attendance, if that's more convenient in the moment."
            />
            <div className="card p-6">
              <ReviewRequestPanel />
            </div>
          </div>
        )}

        {/* REVIEWS CAROUSEL TAB */}
        {activeTab === "carousel" && isAdmin && (
          <div>
            <SectionHeader
              icon={Quote}
              title="Reviews"
              description="Approve, add, or remove the testimonials shown in the carousel on your homepage."
            />
            <ReviewsCarouselPanel />
          </div>
        )}

        {/* MERCH TAB */}
        {activeTab === "merch" && isAdmin && MERCH_ENABLED && (
          <div>
            <SectionHeader
              icon={ShoppingBag}
              title="Merch"
              description="Manage the products members can buy from your shop."
            />
            <MerchPanel />
          </div>
        )}

        {/* DISCOUNTS TAB */}
        {activeTab === "discounts" && isAdmin && (
          <div>
            <SectionHeader
              icon={Tag}
              title="Discounts"
              description="Create and manage promo codes for classes and passes."
            />
            <DiscountsPanel />
          </div>
        )}

        {/* BIRTHDAYS TAB */}
        {activeTab === "birthdays" && isAdmin && (
          <div>
            <SectionHeader
              icon={Cake}
              title="Birthdays"
              description={`${upcomingBirthdays.length} member${upcomingBirthdays.length !== 1 ? "s" : ""} with birthdays on record.`}
            />

            {upcomingBirthdays.length === 0 ? (
              <div className="card p-10 text-center">
                <Cake className="w-10 h-10 mx-auto mb-3 text-[#000000]" strokeWidth={1.5} />
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
                      className={`card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        isToday
                          ? "bg-[#000000]"
                          : isThisWeek
                          ? "bg-white ring-1 ring-[#000000]/25"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0">
                          <p className={`font-heading text-sm truncate ${isToday ? "text-white" : ""}`}>{s.full_name ?? s.email}</p>
                          {s.phone && <p className={`font-body text-xs mt-0.5 truncate ${isToday ? "text-white/70" : "text-gray-400"}`}>{s.phone}</p>}
                        </div>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          isToday ? "bg-white/15" : isThisWeek ? "bg-[#000000]/10" : ""
                        }`}>
                          {isToday ? (
                            <PartyPopper className="w-5 h-5 text-white" strokeWidth={1.75} />
                          ) : isThisWeek ? (
                            <Cake className="w-5 h-5 text-[#000000]" strokeWidth={1.75} />
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
                          <span className="inline-flex items-center bg-white text-[#000000] font-heading text-xs px-2.5 py-1 rounded-full">
                            🎂 Today!
                          </span>
                        ) : isThisWeek ? (
                          <span className="inline-flex items-center bg-[#000000] text-white font-heading text-xs px-2.5 py-1 rounded-full">
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
                        className={`mt-3 font-body text-xs hover:underline block ${isToday ? "text-white" : "text-[#000000]"}`}
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
          <div className="max-w-xl">
            <SectionHeader
              icon={Send}
              title="Message a Segment"
              description="Send a one-off email to a filtered group — a promo, a new-class announcement, a check-in."
            />

            <div className="card p-6 sm:p-8 space-y-6">
              <div>
                <label className="label">Who</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(segmentLabels) as SegmentKey[]).map(key => {
                    const active = segmentFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setSegmentFilter(key); setBroadcastSent(null); setBroadcastErrors([]); setSelectedBroadcastIds(new Set(segments[key].map(s => s.id))); }}
                        className={`font-body text-sm px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                          active ? "bg-[#000000] text-white" : "bg-white text-gray-500 border border-gray-200 hover:text-black"
                        }`}
                      >
                        {segmentLabels[key]} · {segments[key].length}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Recipients ({selectedBroadcastIds.size} selected)</label>
                  <button type="button" onClick={selectAllInSegment} className="font-body text-xs text-[#000000] hover:underline">Select all</button>
                </div>
                {currentSegment.length === 0 ? (
                  <p className="font-body text-sm text-gray-400">No members match this filter.</p>
                ) : (
                  <div className="space-y-1 max-h-44 overflow-y-auto bg-white border border-gray-100 rounded-xl p-2">
                    {currentSegment.map(s => {
                      const checked = selectedBroadcastIds.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 font-body text-sm px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${checked ? "bg-[#000000]/5" : "hover:bg-gray-50"}`}
                        >
                          <input type="checkbox" className="shrink-0" checked={checked} onChange={() => toggleBroadcastRecipient(s.id)} />
                          <span className="w-7 h-7 rounded-full bg-[#000000]/10 text-[#000000] font-heading text-[11px] flex items-center justify-center shrink-0">
                            {initials(s.full_name, s.email)}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{s.full_name ?? s.email}</span>
                          <span className="text-xs text-gray-400 truncate shrink-0 max-w-[40%]">{s.email}</span>
                        </label>
                      );
                    })}
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
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
