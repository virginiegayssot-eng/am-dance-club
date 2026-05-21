"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/stripe";
import type { Class, Pass, Profile } from "@/lib/supabase";

type ClassWithMeta = Class & { registered_count: number; is_registered: boolean; guest_count: number };

export default function ClassesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [classes, setClasses] = useState<ClassWithMeta[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activePasses, setActivePasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

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

    const today = new Date().toISOString().split("T")[0];
    const { data: classData } = await supabase
      .from("classes").select("*")
      .eq("is_cancelled", false).gte("class_date", today)
      .order("class_date", { ascending: true });

    if (!classData) { setLoading(false); return; }

    const { data: regCounts } = await supabase.from("class_registration_counts").select("*");
    let userRegs: { class_id: string; guest_count: number }[] = [];
    if (profile || (await supabase.auth.getUser()).data.user) {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (uid) {
        const { data: regs } = await supabase
          .from("registrations").select("class_id, guest_count")
          .eq("student_id", uid).eq("status", "confirmed");
        userRegs = regs ?? [];
      }
    }

    setClasses(classData.map(c => ({
      ...c,
      registered_count: regCounts?.find(rc => rc.class_id === c.id)?.registered_count ?? 0,
      is_registered: !!userRegs.find(r => r.class_id === c.id),
      guest_count: userRegs.find(r => r.class_id === c.id)?.guest_count ?? 0,
    })));
    setLoading(false);
  }

  // Smart book: auto-use best pass, else show options
  async function handleBook(cls: ClassWithMeta, guestCount = 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    // Auto-use first valid pass (sorted by soonest expiry)
    if (activePasses.length > 0) {
      setActionId(cls.id + (guestCount > 0 ? "-double" : ""));
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: cls.id, passId: activePasses[0].id, guestCount }),
      });
      const { error } = await res.json();
      if (error) { alert(error); setActionId(null); return; }
      await loadData();
      setActionId(null);
      return;
    }

    // No pass — show payment options
    setExpandedId(cls.id === expandedId ? null : cls.id);
  }

  async function payAndBook(cls: ClassWithMeta, passTypeId: "casual" | "double") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setActionId(cls.id + passTypeId);
    const res = await fetch("/api/stripe/pass-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passTypeId, classId: cls.id }),
    });
    const { url, error } = await res.json();
    if (error) { alert(error); setActionId(null); return; }
    window.location.href = url;
  }

  const hasPass = activePasses.length > 0;
  const bestPass = activePasses[0];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Book a class</p>
            <h1 className="section-title mb-1">Upcoming Classes</h1>
            <p className="font-body text-gray-500">Every Friday at 7:00 AM · North Steyne Surf Club</p>
          </div>
          <Link href="/passes" className="btn-pink self-start sm:self-auto">View Passes & Pricing</Link>
        </div>

        {/* Active pass notice */}
        {hasPass && (
          <div className="bg-[#a3bdfe]/20 border border-[#a3bdfe] rounded-2xl p-4 mb-8">
            <div>
              <p className="font-heading text-sm">
                {(bestPass as any).pass_types?.name ?? "Your pass"} — {bestPass.classes_remaining} class{bestPass.classes_remaining !== 1 ? "es" : ""} remaining
              </p>
              <p className="font-body text-xs text-gray-500">
                Clicking "Book" will automatically deduct from your pass.
                {bestPass.expires_at && ` Expires ${new Date(bestPass.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}.`}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="card p-6 animate-pulse h-64 bg-gray-50" />)}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🕖</div>
            <h3 className="font-heading text-xl mb-2">No upcoming classes</h3>
            <p className="font-body text-gray-500">Check back soon for new Friday sessions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => {
              const spotsLeft = cls.capacity - cls.registered_count;
              const isFull = spotsLeft <= 0;
              const isExpanded = expandedId === cls.id;
              const isLoading = actionId?.startsWith(cls.id);

              return (
                <div key={cls.id} className="card flex flex-col">
                  <div className="bg-gradient-to-br from-[#e4c3cc] to-[#a3bdfe] p-6">
                    <p className="font-body text-xs uppercase tracking-widest text-[#2041d8] mb-1">Friday</p>
                    <p className="font-heading text-2xl text-black">
                      {new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="space-y-1.5 mb-5">
                      <div className="flex items-center gap-2 text-sm font-body text-gray-600"><span>🕖</span>7:00 AM · 45 min</div>
                      <div className="flex items-center gap-2 text-sm font-body text-gray-600"><span>📍</span>{cls.location}</div>
                      {isFull && (
                        <div className="flex items-center gap-2 text-sm font-body text-red-500"><span>👥</span>Class full</div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      {cls.is_registered ? (
                        <span className="badge-confirmed px-3 py-1.5 rounded-full text-sm">
                          Booked {cls.guest_count > 0 ? `(+${cls.guest_count} guest)` : "✓"}
                        </span>
                      ) : isFull ? (
                        <p className="font-body text-sm text-gray-400 text-center">Class is full</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Primary book button */}
                          <button
                            onClick={() => handleBook(cls)}
                            disabled={!!actionId}
                            className="btn-primary w-full justify-center"
                          >
                            {isLoading && actionId === cls.id
                              ? "Booking…"
                              : hasPass
                              ? `Book · Use Pass (${bestPass.classes_remaining} left)`
                              : "Book · $24 Casual"}
                          </button>

                          {/* Book for 2 with pass */}
                          {hasPass && bestPass.classes_remaining >= 2 && (
                            <button
                              onClick={() => handleBook(cls, 1)}
                              disabled={!!actionId}
                              className="btn-secondary w-full justify-center text-sm py-2"
                            >
                              {actionId === cls.id + "-double" ? "Booking…" : "Book for 2 · Uses 2 credits"}
                            </button>
                          )}

                          {/* Show payment options toggle when no pass */}
                          {!hasPass && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : cls.id)}
                              className="font-body text-xs text-gray-400 hover:text-gray-600 w-full text-center"
                            >
                              {isExpanded ? "Hide options ↑" : "More options ↓"}
                            </button>
                          )}

                          {/* Expanded payment options */}
                          {isExpanded && !hasPass && (
                            <div className="space-y-2 pt-1">
                              <button
                                onClick={() => payAndBook(cls, "double")}
                                disabled={!!actionId}
                                className="btn-secondary w-full justify-center text-sm py-2"
                              >
                                {actionId === cls.id + "double" ? "Loading…" : "Double Pass $38 (+ 1 guest)"}
                              </button>
                              <Link href="/passes" className="btn-pink w-full justify-center text-sm py-2">
                                Buy a class pass →
                              </Link>
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
      </main>
      <Footer />
    </div>
  );
}
