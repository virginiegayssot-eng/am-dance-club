"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/stripe";
import { todayLocal } from "@/lib/date";
import Link from "next/link";
import { Cake, PartyPopper, Calendar, CreditCard, Banknote, Gift } from "lucide-react";

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
  const [passesSold, setPassesSold] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"3m" | "6m" | "12m">("3m");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) buildRevenue();
  }, [period, passesSold, loading]);

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
      .from("passes").select("*, pass_types(name, price_cents)");

    // All passes sold (for revenue report)
    const { data: allPasses } = await supabase
      .from("passes")
      .select("*, pass_types(name, price_cents), profiles(full_name, email)")
      .order("created_at", { ascending: false });
    setPassesSold(allPasses ?? []);

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
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthPasses = passesSold.filter(p => {
        const created = new Date(p.created_at);
        return created >= start && created <= end && p.source !== "complimentary";
      });
      const total = monthPasses.reduce((s, p) => s + (p.amount_paid_cents ?? p.pass_types?.price_cents ?? 0), 0);

      rows.push({ month: label, casual: 0, passes: total, total });
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

  const totalRevenue = passesSold
    .filter(p => p.source !== "complimentary")
    .reduce((s, p) => s + (p.amount_paid_cents ?? p.pass_types?.price_cents ?? 0), 0);
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
    { key: "birthdays", label: "Birthdays" },
  ] as const;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="font-body text-gray-400">Loading reports…</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#334155] mb-2">Instructor</p>
            <h1 className="section-title">Reports</h1>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total revenue", value: formatPrice(totalRevenue), color: "bg-[#f8fafc]" },
            { label: "Total members", value: totalStudents, color: "bg-[#f8fafc]" },
            { label: "Active (90 days)", value: activeStudents, color: "bg-[#f8fafc]" },
            { label: "Avg attendance", value: `${avgAttendance}%`, color: "bg-[#f8fafc]" },
          ].map(stat => (
            <div key={stat.label} className={`card p-5 ${stat.color}`}>
              <p className="font-heading text-2xl">{stat.value}</p>
              <p className="font-body text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
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
                    ? "border-[#334155] text-[#334155]"
                    : "border-transparent text-gray-500 hover:text-black"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
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
                      period === p ? "bg-[#334155] text-white border-[#334155]" : "border-gray-200 text-gray-500 hover:border-[#334155]"
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
                        className="w-full bg-gradient-to-t from-[#334155] to-[#94a3b8] rounded-t-lg transition-all"
                        style={{ height: `${h}%` }}
                      />
                      <span className="font-body text-xs text-gray-400">{row.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pass Sales */}
            <div className="flex items-center justify-between mb-4 mt-8">
              <h3 className="font-heading text-base">Pass Sales</h3>
              <button onClick={() => downloadCSV(
                passesSold.map(p => ({
                  date: new Date(p.created_at).toLocaleDateString("en-AU"),
                  student: p.profiles?.full_name ?? p.profiles?.email ?? "—",
                  pass: p.pass_types?.name ?? p.pass_type_id,
                  source: p.source ?? "stripe",
                  amount_aud: ((p.amount_paid_cents ?? p.pass_types?.price_cents ?? 0) / 100).toFixed(2),
                })),
                "pass-sales.csv"
              )} className="font-body text-xs text-[#334155] hover:underline">Export CSV</button>
            </div>
            <div className="card overflow-hidden mb-8">
              <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="bg-[#f8fafc] border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Member</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Pass</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Source</th>
                    <th className="text-right px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {passesSold.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 font-body text-sm">No passes sold yet.</td></tr>
                  ) : passesSold.map(p => {
                    const amount = p.amount_paid_cents ?? p.pass_types?.price_cents ?? 0;
                    const source = p.source ?? "stripe";
                    const SourceIcon = source === "stripe" || source === "card_manual" ? CreditCard : source === "cash" ? Banknote : source === "complimentary" ? Gift : null;
                    const sourceLabel = source === "stripe" ? "Stripe" : source === "cash" ? "Cash" : source === "card_manual" ? "Card" : source === "complimentary" ? "Comp" : source;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-500">
                          {new Date(p.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium">{p.profiles?.full_name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{p.profiles?.email}</p>
                        </td>
                        <td className="px-5 py-3">{p.pass_types?.name ?? p.pass_type_id}</td>
                        <td className="px-5 py-3 text-xs">
                          <span className="inline-flex items-center gap-1">
                            {SourceIcon && <SourceIcon className="w-3.5 h-3.5 text-[#334155]" strokeWidth={1.75} />}
                            {sourceLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-heading">{formatPrice(amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Revenue by class */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base">Revenue by Class</h3>
              <button onClick={() => downloadCSV(
                classes.map(c => ({ date: c.class_date, title: c.title, registered: c.registered, attended: c.attended, revenue_aud: (c.revenue / 100).toFixed(2) })),
                "class-revenue.csv"
              )} className="font-body text-xs text-[#334155] hover:underline">Export CSV</button>
            </div>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="bg-[#f8fafc] border-b border-gray-100">
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
              <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="bg-[#f8fafc] border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Date</th>
                    <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Class</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Registered</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Attended</th>
                    <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classes.filter(c => c.class_date >= todayLocal()).map(c => {
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
                              <div className="bg-[#334155] h-1.5 rounded-full" style={{ width: `${rate}%` }} />
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
              <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead className="bg-[#f8fafc] border-b border-gray-100">
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
                          <p className="inline-flex items-center gap-1"><Cake className="w-3.5 h-3.5 text-[#334155]" strokeWidth={1.75} /> {new Date(s.birth_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</p>
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
                        <Link href={`/chat?dm=${s.id}`} className="font-body text-xs text-[#334155] hover:underline">
                          Message
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
                <Cake className="w-10 h-10 mx-auto mb-3 text-[#334155]" strokeWidth={1.5} />
                <p className="font-body text-gray-400">No birthdays on record yet. Encourage members to add their birth date in their profile.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {upcomingBirthdays.map(s => {
                  const isThisWeek = s.daysUntil <= 7;
                  const isToday = s.daysUntil === 0;
                  return (
                    <div key={s.id} className={`card p-5 ${isToday ? "ring-2 ring-[#334155] bg-[#94a3b8]/10" : isThisWeek ? "bg-[#e2e8f0]/10" : ""}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-heading text-sm">{s.full_name ?? s.email}</p>
                          {s.phone && <p className="font-body text-xs text-gray-400 mt-0.5">{s.phone}</p>}
                        </div>
                        {isToday ? <PartyPopper className="w-6 h-6 text-[#334155]" strokeWidth={1.5} /> : isThisWeek ? <Cake className="w-6 h-6 text-[#334155]" strokeWidth={1.5} /> : <Calendar className="w-6 h-6 text-gray-300" strokeWidth={1.5} />}
                      </div>
                      <p className="font-body text-xs text-gray-500">
                        {new Date(s.birth_date!).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
                      </p>
                      <p className={`font-heading text-sm mt-1 ${isToday ? "text-[#334155]" : isThisWeek ? "text-[#e2e8f0]" : "text-gray-400"}`}>
                        {isToday ? "Today!" : `In ${s.daysUntil} day${s.daysUntil !== 1 ? "s" : ""}`}
                      </p>
                      <Link
                        href={`/chat?dm=${s.id}`}
                        className="mt-3 font-body text-xs text-[#334155] hover:underline block"
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
