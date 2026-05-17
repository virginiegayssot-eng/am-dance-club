"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/stripe";
import type { Class, Profile, Registration, Attendance, Pass } from "@/lib/supabase";
import Link from "next/link";

type RegistrationWithClass = Registration & { classes: Class };
type AttendanceWithClass = Attendance & { classes: Class };

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationWithClass[]>([]);
  const [attendance, setAttendance] = useState<AttendanceWithClass[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const justBooked = searchParams.get("success") === "true";
  const justBoughtPass = searchParams.get("passSuccess") === "true";

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (prof?.role === "instructor") { router.push("/instructor"); return; }
    setProfile(prof);

    const { data: regs } = await supabase
      .from("registrations")
      .select("*, classes(*)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    const { data: att } = await supabase
      .from("attendance")
      .select("*, classes(*)")
      .eq("student_id", user.id)
      .order("marked_at", { ascending: false })
      .limit(10);

    const { data: myPasses } = await supabase
      .from("passes")
      .select("*, pass_types(*)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    setRegistrations((regs as RegistrationWithClass[]) ?? []);
    setAttendance((att as AttendanceWithClass[]) ?? []);
    setPasses(myPasses ?? []);
    setLoading(false);
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = registrations.filter(r => r.status === "confirmed" && r.classes?.class_date >= today);
  const past = registrations.filter(r => r.classes?.class_date < today);
  const attendedCount = attendance.filter(a => a.attended).length;

  const activePasses = passes.filter(p =>
    p.classes_remaining > 0 && (!p.expires_at || new Date(p.expires_at) > new Date())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff8f3]">
        <div className="font-body text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Your account</p>
          <h1 className="section-title">
            Hey, {profile?.full_name?.split(" ")[0] ?? "dancer"} 👋
          </h1>
        </div>

        {/* Success banners */}
        {justBooked && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 font-body text-sm text-green-700 flex items-center gap-3">
            <span className="text-xl">🎉</span>
            You're booked! See you on the dancefloor.
          </div>
        )}
        {justBoughtPass && (
          <div className="bg-[#a3bdfe]/20 border border-[#a3bdfe] rounded-2xl p-4 mb-6 font-body text-sm flex items-center gap-3">
            <span className="text-xl">🎟️</span>
            Pass purchased! Head to <Link href="/classes" className="text-[#2041d8] underline font-medium">Classes</Link> to book your first session.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Upcoming", value: upcoming.length, color: "bg-[#a3bdfe]/20" },
            { label: "Classes attended", value: attendedCount, color: "bg-[#e4c3cc]/20" },
            { label: "Active passes", value: activePasses.length, color: "bg-[#fff8f3]" },
            { label: "Past classes", value: past.length, color: "bg-[#fff8f3]" },
          ].map(stat => (
            <div key={stat.label} className={`card p-5 ${stat.color}`}>
              <p className="font-heading text-2xl">{stat.value}</p>
              <p className="font-body text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Active Passes */}
        {activePasses.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl">Your Passes</h2>
              <Link href="/passes" className="font-body text-sm text-[#2041d8] hover:underline">
                Buy more →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activePasses.map(p => (
                <div key={p.id} className="card p-5 bg-gradient-to-br from-[#a3bdfe]/10 to-[#e4c3cc]/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-heading text-sm">{p.pass_types?.name}</p>
                      <p className="font-body text-xs text-gray-500 mt-0.5">
                        {p.expires_at
                          ? `Expires ${new Date(p.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
                          : "No expiry"}
                      </p>
                    </div>
                    <span className="badge-confirmed">{p.classes_remaining} left</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-[#2041d8] h-1.5 rounded-full transition-all"
                      style={{ width: `${(p.classes_remaining / p.classes_total) * 100}%` }}
                    />
                  </div>
                  <p className="font-body text-xs text-gray-400 mt-1">
                    {p.classes_total - p.classes_remaining}/{p.classes_total} used
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* No pass prompt */}
        {activePasses.length === 0 && (
          <div className="card p-5 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#e4c3cc]/10">
            <div>
              <p className="font-heading text-sm">Save with a class pass</p>
              <p className="font-body text-xs text-gray-500 mt-0.5">5-class pass from $100 · 10-class pass from $200</p>
            </div>
            <Link href="/passes" className="btn-primary py-2 px-4 text-sm shrink-0">View Passes</Link>
          </div>
        )}

        {/* Upcoming classes */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xl">Upcoming Classes</h2>
            <Link href="/classes" className="font-body text-sm text-[#2041d8] hover:underline">
              Browse all →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-body text-gray-400 mb-4">No upcoming classes booked.</p>
              <Link href="/classes" className="btn-primary">Book a Class</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(reg => (
                <div key={reg.id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-confirmed">Confirmed</span>
                      {reg.payment_type === "pass" && (
                        <span className="badge bg-[#a3bdfe]/30 text-[#2041d8]">Pass</span>
                      )}
                      {reg.payment_type === "double" && (
                        <span className="badge bg-[#e4c3cc]/50 text-black">Double (+1 guest)</span>
                      )}
                    </div>
                    <h3 className="font-heading text-base">{reg.classes?.title}</h3>
                    <p className="font-body text-sm text-gray-500 mt-1">
                      {new Date(reg.classes?.class_date + "T00:00:00").toLocaleDateString("en-AU", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric"
                      })} · 7:00 AM · {reg.classes?.location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {reg.amount_paid_cents ? (
                      <>
                        <p className="font-heading text-base">{formatPrice(reg.amount_paid_cents)}</p>
                        <p className="font-body text-xs text-gray-400">paid</p>
                      </>
                    ) : (
                      <p className="font-body text-xs text-gray-400">Pass used</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Attendance history */}
        {attendance.length > 0 && (
          <section className="mb-10">
            <h2 className="font-heading text-xl mb-5">Attendance History</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm font-body">
                <thead className="bg-[#fff8f3] border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Class</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendance.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">{a.classes?.title}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(a.classes?.class_date + "T00:00:00").toLocaleDateString("en-AU", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </td>
                      <td className="px-5 py-3">
                        {a.attended
                          ? <span className="badge-confirmed">Present</span>
                          : <span className="badge badge-cancelled">Absent</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-4">
          <Link href="/classes" className="btn-primary">Book Next Class</Link>
          <Link href="/passes" className="btn-secondary">Buy a Pass</Link>
          <Link href="/videos" className="btn-secondary">Watch Recordings</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
