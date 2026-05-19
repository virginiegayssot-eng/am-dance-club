"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/stripe";
import Link from "next/link";

type StudentReport = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  birth_date: string | null;
  classes_attended: number;
  classes_booked: number;
  total_spent: number;
  active_pass: string | null;
  pass_remaining: number;
  last_class: string | null;
};

type ClassReport = {
  id: string;
  title: string;
  class_date: string;
  capacity: number;
  registered: number;
  attended: number;
  revenue: number;
};

type RevenueRow = {
  month: string;
  casual: number;
  passes: number;
  total: number;
};

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"revenue" | "attendance" | "students" | "birthdays">("revenue");
  const [students, setStudents] = useState<StudentReport[]>([]);
  const [classes, setClasses] = useState<ClassReport[]>([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"3m" | "6m" | "12m">("3m");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) buildRevenue();
  }, [period, classes]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "instructor") { router.push("/dashboard"); return; }
    await loadData();
  }

  async function loadData() {
    // Students
    const { data: profiles } = await supabase
      .from("profiles").select("*").eq("role", "student").order("full_name");

    // Registrations
    const { data: regs } = await supabase
      .from("registrations")
      .select("*, classes(class_date, title)")
      .eq("status", "confirmed");

    // Attendance
    const { data: att } = await supabase.from("attendance").select("*");

    // Passes
    const { data: passes } = await supabase
      .from("passes").select("*, pass_types(name)");

    // Classes
    const { data: classData } = await supabase
      .from("classes").select("*").order("class_date", { ascending: true });

    // Build student reports
    const studentRows: StudentReport[] = (profiles ?? []).map(p => {
      const myRegs = (regs ?? []).filter(r => r.student_id === p.id);
      const myAtt = (att ?? []).filter(a => a.student_id === p.id && a.attended);
      const myPasses = (passes ?? []).filter(ps => ps.student_id === p.id);
      const activePasses = myPasses.filter(ps =>
        ps.classes_remaining > 0 && (!ps.expires_at || new Date(ps.expires_at) > new Date())
      );
      const lastClass = myRegs
        .map(r => r.classes?.class_date)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null;

      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone ?? null,
        birth_date: (p as any).birth_date ?? null,
        classes_attended: myAtt.length,
        classes_booked: myRegs.length,
        total_spent: myRegs.reduce((s, r) => s + (r.amount_paid_cents ?? 0), 0),
        active_pass: activePasses[0]?.pass_types?.name ?? null,
        pass_remaining: activePasses[0]?.classes_remaining ?? 0,
        last_class: lastClass,
      };
    });
    setStudents(studentRows);

    // Build class reports
    const classRows: ClassReport[] = (classData ?? []).map(c => {
      const classRegs = (regs ?? []).filter(r => r.class_id === c.id);
      const classAtt = (att ?? []).filter(a => a.class_id === c.id && a.attended);
      return {
        id: c.id,
        title: c.title,
        class_date: c.class_date,
        capacity: c.capacity,
        registered: classRegs.length,
        attended: classAtt.length,
        revenue: classRegs.reduce((s, r) => s + (r.amount_paid_cents ?? 0), 0),
      };
    });
    setClasses(classRows);

    setLoading(false);
  }

  function buildRevenue() {
    const months = parseInt(period);
    const rows: RevenueRow[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      const start = d.toISOString().split("T")[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

      const monthClasses = classes.filter(c => c.class_date >= start && c.class_date <= end);
      const casual = monthClasses.reduce((s, c) => s + c.revenue, 0);

      rows.push({ month: label, casual, passes: 0, total: casual });
    }

    setRevenue(rows);
  }

  function downloadCSV(data: object[], filename: string) {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(","),
      ...data.map(row =>
        keys.map(k => {
          const val = (row as Record<string, unknown>)[k];
          return typeof val === "string" && val.includes(",") ? `"${val}"` : val ?? "";
        }).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const upcomingBirthdays = students
    .filter(s => s.birth_date)
    .map(s => {
      const bd = new Date(s.birth_date!);
      const now = new Date();
      const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
      const next = thisYear < now
        ? new Date(now.getFullYear() + 1, bd.getMonth(), bd.getDate())
        : thisYear;
      const daysUntil = Math.ceil((next.getTime() - now.getTime()) / 86400000);
      return { ...s, daysUntil, nextBirthday: next };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 20);

  const totalRevenue = classes.reduce((s, c) => s + c.revenue, 0);
  const totalStudents = students.length;
  const activeStudents = students.filter(s => {
    if (!s.last_class) return false;
    const d = new Date(s.last_class);
    d.setDate(d.getDate() + 90);
    return d > new Date();
  }).length;
  const avgAttendance = classes.length
    ? Math.round(classes.reduce((s, c) => s + (c.registered > 0 ? c.attended / c.registered : 0), 0) / classes.length * 100)
    : 0;

  const tabs = [
    { key: "revenue", label: "Revenue" },
    { key: "attendance", label: "Attendance" },
    { key: "students", label: "Members" },
    { key: "birthdays", label: "Birthdays 🎂" },
  ] as const;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff8f3]">
      <div className="font-body text-gray-400">Loading reports…</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Instructor</p>
            <h1 className="section-title">Reports</h1>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total revenue", value: formatPrice(totalRevenue), color: "bg-[#a3bdfe]/20" },
            { label: "Total members", value: totalStudents, color: "bg-[#e4c3cc]/20" },
            { label: "Active (90 days)", value: activeStudents, color: "bg-[#fff8f3]" },
            { label: "Avg attendance", value: `${avgAttendance}%`, color: "bg-[#fff8f3]" },
          ].map(stat => (
            <div key={stat.label} className={`card p-5 ${stat.color}`}>
              <p className="font-heading text-2xl">{stat.value}</p>
              <p className="font-body text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`font-body text-sm px-4 py-2.5 -mb-px border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#2041d8] text-[#2041d8]"
                  : "border-transparent text-gray-500 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* REVENUE TAB */}
        {activeTab === "revenue" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                {(["3m","6m","12m"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`font-body text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      period === p ? "bg-[#2041d8] text-white border-[#2041d8]" : "border-gray-200 text-gray-500 hover:border-[#2041d8]"
                    }`}
                  >
                    {p === "3m" ? "3 months" : p === "6m" ? "6 months" : "12 months"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => downloadCSV(revenue, "revenue-report.csv")}
                className="btn-secondary py-2 px-4 text-xs"
              >
                Export CSV
              </button>
            </div>

            {/* Bar chart */}
            <div className="card p-6 mb-6">
              <div className="flex items-end gap-3 h-48">
                {revenue.map(row => {
                  const max = Math.max(...revenue.map(r => r.total), 1);
                  const h = Math.max((row.total / max) * 100, 2);
                  return (
                    <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="font-body text-xs text-gray-500">{formatPrice(row.total)}</span>
                      <div
                        className="w-full bg-gradient-to-t from-[#2041d8] to-[#a3bdfe] rounded-t-lg transition-all"
                        style={{ height: `${h}%` }}
                      />
                      <span className="font-body text-xs text-gray-400">{row.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue by class */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base">Revenue by Class</h3>
              <button onClick={() => downloadCSV(
                classes.map(c => ({ date: c.class_date, title: c.title, registered: c.registered, attended: c.attended, revenue_aud: (c.revenue / 100).toFixed(2) })),
                "class-revenue.csv"
              )} className="font-body text-xs text-[#2041d8] hover:underline">Export CSV</button>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm font-body">
                <thead className="bg-[#fff8f3] border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Class</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Booked</th>
                    <th className="text-right px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classes.slice(0, 20).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(c.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3 font-medium">{c.title}</td>
                      <td className="px-5 py-3 text-center">{c.registered}/{c.capacity}</td>
                      <td className="px-5 py-3 text-right font-heading">{formatPrice(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => downloadCSV(
                classes.map(c => ({ date: c.class_date, title: c.title, registered: c.registered, attended: c.attended, rate: c.registered ? `${Math.round(c.attended/c.registered*100)}%` : "0%" })),
                "attendance-report.csv"
              )} className="btn-secondary py-2 px-4 text-xs">Export CSV</button>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm font-body">
                <thead className="bg-[#fff8f3] border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Class</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Registered</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Attended</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classes.filter(c => c.class_date >= new Date().toISOString().split("T")[0]).map(c => {
                    const rate = c.registered > 0 ? Math.round((c.attended / c.registered) * 100) : 0;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-500">
                          {new Date(c.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3 font-medium">{c.title}</td>
                        <td className="px-5 py-3 text-center">{c.registered}</td>
                        <td className="px-5 py-3 text-center">{c.attended}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-[#2041d8] h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className={`text-xs font-heading ${rate >= 80 ? "text-green-600" : rate >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                              {rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => downloadCSV(
                students.map(s => ({
                  name: s.full_name ?? "",
                  email: s.email,
                  phone: s.phone ?? "",
                  birth_date: s.birth_date ?? "",
                  classes_booked: s.classes_booked,
                  classes_attended: s.classes_attended,
                  total_spent_aud: (s.total_spent / 100).toFixed(2),
                  active_pass: s.active_pass ?? "",
                  pass_remaining: s.pass_remaining,
                  last_class: s.last_class ?? "",
                })),
                "students-report.csv"
              )} className="btn-secondary py-2 px-4 text-xs">Export CSV</button>
            </div>
            <div className="card overflow-hidden">
              <table className="w-full text-sm font-body">
                <thead className="bg-[#fff8f3] border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Member</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Contact</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Classes</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Pass</th>
                    <th className="text-right px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Spent</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Chat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="font-medium">{s.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {s.phone && <p>{s.phone}</p>}
                        {s.birth_date && (
                          <p>🎂 {new Date(s.birth_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <p>{s.classes_attended}/{s.classes_booked}</p>
                        <p className="text-xs text-gray-400">att/booked</p>
                      </td>
                      <td className="px-5 py-3">
                        {s.active_pass ? (
                          <div>
                            <span className="badge-confirmed">{s.active_pass}</span>
                            <p className="text-xs text-gray-400 mt-0.5">{s.pass_remaining} left</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-heading">{formatPrice(s.total_spent)}</td>
                      <td className="px-5 py-3 text-center">
                        <Link href={`/chat?dm=${s.id}`} className="font-body text-xs text-[#2041d8] hover:underline">
                          Message
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BIRTHDAYS TAB */}
        {activeTab === "birthdays" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="font-body text-sm text-gray-500">
                {upcomingBirthdays.length} member{upcomingBirthdays.length !== 1 ? "s" : ""} with birthdays on record
              </p>
              <button onClick={() => downloadCSV(
                upcomingBirthdays.map(s => ({
                  name: s.full_name ?? "",
                  email: s.email,
                  phone: s.phone ?? "",
                  birth_date: s.birth_date ?? "",
                  days_until: s.daysUntil,
                })),
                "birthdays.csv"
              )} className="btn-secondary py-2 px-4 text-xs">Export CSV</button>
            </div>

            {upcomingBirthdays.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-4xl mb-3">🎂</p>
                <p className="font-body text-gray-400">No birthdays on record yet. Encourage members to add their birth date in their profile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {upcomingBirthdays.map(s => {
                  const isThisWeek = s.daysUntil <= 7;
                  const isToday = s.daysUntil === 0;
                  return (
                    <div key={s.id} className={`card p-5 ${isToday ? "ring-2 ring-[#2041d8] bg-[#a3bdfe]/10" : isThisWeek ? "bg-[#e4c3cc]/10" : ""}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-heading text-sm">{s.full_name ?? s.email}</p>
                          {s.phone && <p className="font-body text-xs text-gray-400 mt-0.5">{s.phone}</p>}
                        </div>
                        <span className="text-2xl">{isToday ? "🎉" : isThisWeek ? "🎂" : "🗓️"}</span>
                      </div>
                      <p className="font-body text-xs text-gray-500">
                        {new Date(s.birth_date!).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
                      </p>
                      <p className={`font-heading text-sm mt-1 ${isToday ? "text-[#2041d8]" : isThisWeek ? "text-[#e4c3cc]" : "text-gray-400"}`}>
                        {isToday ? "🎊 Today!" : `In ${s.daysUntil} day${s.daysUntil !== 1 ? "s" : ""}`}
                      </p>
                      <Link
                        href={`/chat?dm=${s.id}`}
                        className="mt-3 font-body text-xs text-[#2041d8] hover:underline block"
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
      </main>
      <Footer />
    </div>
  );
}
