"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase";
import { formatPrice, formatTime } from "@/lib/stripe";
import { todayLocal } from "@/lib/date";
import type { Class, Pass, Profile } from "@/lib/supabase";
import { Clock, MapPin, Users, Check } from "lucide-react";

type ClassWithMeta = Class & { registered_count: number; is_registered: boolean; guest_count: number; instructor_name: string | null; instructor2_name: string | null; registration_id: string | null };

export default function ClassesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassWithMeta[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activePasses, setActivePasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "special" | "alexandria" | "manly" | "videoshoot">("all");
  const [actionError, setActionError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const onVisible = () => { if (!document.hidden) loadData(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);

      const { data: passes } = await supabase
        .from("passes")
        .select("*, pass_types(*)")
        .eq("student_id", user.id)
        .gt("classes_remaining", 0)
        .order("expires_at", { ascending: true, nullsFirst: false });

      setActivePasses((passes ?? []).filter(p => !p.expires_at || new Date(p.expires_at) > new Date()));
    }

    const today = todayLocal();
    const { data: classData } = await supabase
      .from("classes").select("*")
      .eq("is_cancelled", false).gte("class_date", today)
      .order("class_date", { ascending: true });

    if (!classData) { setLoading(false); return; }

    const { data: instructorProfiles } = await supabase
      .from("profiles").select("id, full_name, show_on_instructors_page")
      .eq("role", "instructor");

    const { data: regCounts } = await supabase.from("class_registration_counts").select("*");
    let userRegs: { id: string; class_id: string; guest_count: number }[] = [];
    if (profile || (await supabase.auth.getUser()).data.user) {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (uid) {
        const { data: regs } = await supabase
          .from("registrations").select("id, class_id, guest_count")
          .eq("student_id", uid).eq("status", "confirmed");
        userRegs = regs ?? [];
      }
    }

    setClasses(classData.map((c: any) => ({
      ...c,
      registered_count: regCounts?.find(rc => rc.class_id === c.id)?.registered_count ?? 0,
      is_registered: !!userRegs.find(r => r.class_id === c.id),
      guest_count: userRegs.find(r => r.class_id === c.id)?.guest_count ?? 0,
      registration_id: userRegs.find(r => r.class_id === c.id)?.id ?? null,
      instructor_name: instructorProfiles?.find(i => i.id === c.instructor_id && i.show_on_instructors_page)?.full_name ?? null,
      instructor2_name: instructorProfiles?.find(i => i.id === c.instructor_id_2 && i.show_on_instructors_page)?.full_name ?? null,
    })));
    setLoading(false);
  }

  // Smart book: auto-use best pass, else show options
  async function handleBook(cls: ClassWithMeta) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    // Auto-use first valid pass (sorted by soonest expiry)
    if (activePasses.length > 0) {
      setActionId(cls.id);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: cls.id, passId: activePasses[0].id, guestCount: 0 }),
      });
      const { error } = await res.json();
      if (error) { setActionError(error); setActionId(null); return; }
      await loadData();
      setActionId(null);
      return;
    }

    // No pass — show payment options
    setExpandedId(cls.id === expandedId ? null : cls.id);
  }

  async function payAndBook(cls: ClassWithMeta, passTypeId: "casual", useAltDuration = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setActionId(cls.id + passTypeId + (useAltDuration ? "-alt" : ""));
    const res = await fetch("/api/stripe/pass-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passTypeId, classId: cls.id, useAltDuration }),
    });
    const { url, error } = await res.json();
    if (error) { setActionError(error); setActionId(null); return; }
    window.location.href = url;
  }

  async function cancelBooking(registrationId: string) {
    setCancellingId(registrationId);
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId }),
    });
    const data = await res.json();
    setCancellingId(null);
    if (!res.ok) { setActionError(data.error ?? "Something went wrong."); return; }
    await loadData();
  }

  const hasPass = activePasses.length > 0;
  const bestPass = activePasses[0];
  const visibleClasses = classes.filter(c => {
    if (filter === "special") return c.is_special;
    if (filter === "alexandria") return c.location.toLowerCase().includes("alexandria");
    if (filter === "manly") return c.location.toLowerCase().includes("manly");
    if (filter === "videoshoot") return c.is_special && (c.special_label ?? "").toLowerCase().includes("video");
    return true;
  });
  const emptyStateLabel: Record<typeof filter, string> = {
    all: "No upcoming classes",
    special: "No special classes right now",
    alexandria: "No upcoming classes at Alexandria",
    manly: "No upcoming classes at Manly",
    videoshoot: "No video shoots scheduled right now",
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-2">Book a class</p>
            <h1 className="section-title mb-1">Upcoming Classes</h1>
            <p className="font-body text-gray-500">Tuesdays (Alexandria) · Thursdays (Manly)</p>
          </div>
          <Link href="/passes" className="btn-pink self-start sm:self-auto">View Passes & Pricing</Link>
        </div>

        <div className="flex gap-3 mb-8 flex-wrap">
          <button onClick={() => setFilter("all")} className={filter === "all" ? "btn-primary" : "btn-secondary"}>
            All Classes
          </button>
          <button onClick={() => setFilter("special")} className={filter === "special" ? "btn-primary" : "btn-secondary"}>
            Special Classes
          </button>
          <button onClick={() => setFilter("alexandria")} className={filter === "alexandria" ? "btn-primary" : "btn-secondary"}>
            Alexandria
          </button>
          <button onClick={() => setFilter("manly")} className={filter === "manly" ? "btn-primary" : "btn-secondary"}>
            Manly
          </button>
          <button onClick={() => setFilter("videoshoot")} className={filter === "videoshoot" ? "btn-primary" : "btn-secondary"}>
            Videoshoot
          </button>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 font-body text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Active pass notice */}
        {hasPass && (
          <div className="bg-[#9b7fc7]/20 border border-[#9b7fc7] rounded-2xl p-4 mb-8 space-y-1.5">
            {activePasses.map(p => (
              <p key={p.id} className="font-heading text-sm">
                {(p as any).pass_types?.name ?? "Your pass"} — {p.classes_remaining} class{p.classes_remaining !== 1 ? "es" : ""} remaining
                {p.expires_at && ` · Expires ${new Date(p.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`}
              </p>
            ))}
            <p className="font-body text-xs text-gray-500">
              Clicking "Book" will automatically deduct from the pass expiring soonest.
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="card p-6 animate-pulse h-64 bg-gray-50" />)}
          </div>
        ) : visibleClasses.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-12 h-12 mx-auto mb-4 text-[#000000]" strokeWidth={1.5} />
            <h3 className="font-heading text-xl mb-2">{emptyStateLabel[filter]}</h3>
            <p className="font-body text-gray-500">
              {filter === "all" ? "Check back soon for new classes." : "Check back soon, or view All Classes."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleClasses.map(cls => {
              const spotsLeft = cls.capacity - cls.registered_count;
              const isFull = spotsLeft <= 0;
              const isExpanded = expandedId === cls.id;
              const isLoading = actionId?.startsWith(cls.id);
              const canUsePass = hasPass && !cls.is_special;

              return (
                <div key={cls.id} className="card flex flex-col">
                  <div className="relative bg-gradient-to-br from-[#e2d0fb] to-[#9b7fc7] p-6">
                    {cls.is_special && (
                      <span className="absolute top-4 right-4 bg-[#000000] text-white text-xs font-body font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                        {cls.special_label || "Special Class"}
                      </span>
                    )}
                    <p className="font-body text-xs uppercase tracking-widest text-[#000000] mb-1">
                      {new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long" })}
                    </p>
                    <p className="font-heading text-2xl text-black">
                      {new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-3">
                      <h3 className="font-heading text-lg leading-snug">{cls.title}</h3>
                      {[cls.instructor_name, cls.instructor2_name].filter(Boolean).length > 0 && (
                        <p className="font-body text-xs text-gray-500 mt-0.5">
                          w/ {[cls.instructor_name, cls.instructor2_name].filter(Boolean).join(" & ")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 mb-5">
                      <div className="flex items-center gap-2 text-sm font-body text-gray-600"><Clock className="w-4 h-4 text-[#000000]" strokeWidth={1.5} />{formatTime(cls.class_time)} · {cls.duration_minutes} min</div>
                      <div className="flex items-center gap-2 text-sm font-body text-gray-600"><MapPin className="w-4 h-4 text-[#000000]" strokeWidth={1.5} />{cls.location}</div>
                      {isFull && (
                        <div className="flex items-center gap-2 text-sm font-body text-red-500"><Users className="w-4 h-4" strokeWidth={1.5} />Class full</div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      {cls.is_registered ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="badge-confirmed px-3 py-1.5 rounded-full text-sm inline-flex items-center gap-1.5">
                            Booked {cls.guest_count > 0 ? `(+${cls.guest_count} guest)` : <Check className="w-3.5 h-3.5" strokeWidth={2} />}
                          </span>
                          {cls.registration_id && (
                            <button
                              onClick={() => setConfirmCancelId(cls.registration_id)}
                              disabled={cancellingId === cls.registration_id}
                              className="font-body text-xs text-gray-400 hover:text-red-500"
                            >
                              {cancellingId === cls.registration_id ? "Cancelling…" : "Cancel"}
                            </button>
                          )}
                        </div>
                      ) : isFull ? (
                        <p className="font-body text-sm text-gray-400 text-center">Class is full</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Special classes can't be booked with an existing pass — casual payment only */}
                          {cls.is_special && (
                            <p className="font-body text-xs text-gray-400 text-center pb-1">Special classes are booked separately — class passes don't apply here.</p>
                          )}

                          {/* Primary book button */}
                          <button
                            onClick={() => canUsePass ? handleBook(cls) : payAndBook(cls, "casual")}
                            disabled={!!actionId}
                            className="btn-primary w-full justify-center"
                          >
                            {isLoading
                              ? "Booking…"
                              : canUsePass
                              ? `Book · Use Pass (${bestPass.classes_remaining} left)`
                              : `Book · ${formatPrice(cls.price_cents)} Casual (${cls.duration_minutes} min)`}
                          </button>

                          {/* Show payment options toggle when no usable pass */}
                          {!canUsePass && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : cls.id)}
                              className="font-body text-xs text-gray-400 hover:text-gray-600 w-full text-center"
                            >
                              {isExpanded ? "Hide options ↑" : "More options ↓"}
                            </button>
                          )}

                          {/* Expanded payment options */}
                          {isExpanded && !canUsePass && (
                            <div className="space-y-2 pt-1">
                              {cls.alt_duration_minutes && cls.alt_price_cents && (
                                <button
                                  onClick={() => payAndBook(cls, "casual", true)}
                                  disabled={!!actionId}
                                  className="btn-secondary w-full justify-center text-sm py-2"
                                >
                                  {actionId === cls.id + "casual-alt" ? "Loading…" : `${formatPrice(cls.alt_price_cents)} Casual (${cls.alt_duration_minutes} min)`}
                                </button>
                              )}
                              {!cls.is_special && (
                                <Link href="/passes" className="btn-pink w-full justify-center text-sm py-2">
                                  Buy a class pass →
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {confirmCancelId && (
          <ConfirmDialog
            message="Cancel this booking? This cannot be undone."
            onCancel={() => setConfirmCancelId(null)}
            onConfirm={() => { const id = confirmCancelId; setConfirmCancelId(null); cancelBooking(id); }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
