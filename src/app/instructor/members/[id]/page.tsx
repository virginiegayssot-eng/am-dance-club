"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase";
import { isValidPhone } from "@/lib/phone";
import { todayLocal } from "@/lib/date";
import { formatPrice, formatTime } from "@/lib/stripe";
import type { Profile, Pass, PassType, MemberNote } from "@/lib/supabase";
import { ArrowLeft, Cake, CreditCard, Banknote, Gift, type LucideIcon } from "lucide-react";

type PassWithType = Pass & { pass_types?: PassType };

type RegRow = {
  id: string;
  class_id: string;
  title: string;
  class_date: string;
  class_time: string;
  status: string;
  guest_count: number;
  payment_type: string;
  pass_id: string | null;
  attended: boolean;
};

type MerchRow = { id: string; created_at: string; amount_paid_cents: number | null; title: string };

type TimelineEvent =
  | { kind: "joined"; sortKey: string }
  | { kind: "pass"; sortKey: string; pass: PassWithType }
  | { kind: "class"; sortKey: string; reg: RegRow }
  | { kind: "merch"; sortKey: string; order: MerchRow };

function sourceMeta(source: string | null): { icon: LucideIcon; label: string } {
  if (source === "stripe") return { icon: CreditCard, label: "Stripe" };
  if (source === "card_manual") return { icon: CreditCard, label: "Card" };
  if (source === "cash") return { icon: Banknote, label: "Cash" };
  if (source === "complimentary") return { icon: Gift, label: "Comp" };
  return { icon: CreditCard, label: source ?? "—" };
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export default function MemberProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [student, setStudent] = useState<Profile | null>(null);
  const [passes, setPasses] = useState<PassWithType[]>([]);
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [merch, setMerch] = useState<MerchRow[]>([]);
  const [note, setNote] = useState<MemberNote | null>(null);
  const [tab, setTab] = useState<"timeline" | "passes" | "notes">("timeline");
  const [copied, setCopied] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{ message: string; confirmLabel?: string; action: () => void } | null>(null);
  const [removeError, setRemoveError] = useState("");

  // Assign pass modal
  const [showAssignPass, setShowAssignPass] = useState(false);
  const [assignPassTypeId, setAssignPassTypeId] = useState("");
  const [assignPassSource, setAssignPassSource] = useState("cash");
  const [assignPassAmount, setAssignPassAmount] = useState("");
  const [assignPassClassesRemaining, setAssignPassClassesRemaining] = useState("");
  const [assignPassLoading, setAssignPassLoading] = useState(false);
  const [assignPassError, setAssignPassError] = useState("");

  // Pass actions (debit / delete)
  const [debitingPassId, setDebitingPassId] = useState<string | null>(null);
  const [deletingPassId, setDeletingPassId] = useState<string | null>(null);
  const [passActionError, setPassActionError] = useState("");

  // Edit details modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", birth_month: "", birth_day: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Notes
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState("");

  useEffect(() => { loadAll(); }, [studentId]);

  async function loadAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (me?.role !== "instructor") { router.push("/dashboard"); return; }

    const { data: s } = await supabase.from("profiles").select("*").eq("id", studentId).single();
    if (!s) { setNotFound(true); setLoading(false); return; }
    setStudent(s);

    const { data: pts } = await supabase.from("pass_types").select("*").order("price_cents", { ascending: true });
    setPassTypes(pts ?? []);
    if (!assignPassTypeId && pts && pts.length > 0) setAssignPassTypeId(pts[0].id);

    const { data: ps } = await supabase
      .from("passes").select("*, pass_types(*)")
      .eq("student_id", studentId).order("created_at", { ascending: false });
    setPasses(ps ?? []);

    const { data: rs } = await supabase
      .from("registrations")
      .select("id, class_id, status, guest_count, payment_type, pass_id, classes(title, class_date, class_time)")
      .eq("student_id", studentId);

    const classIds = (rs ?? []).map((r: any) => r.class_id);
    const { data: att } = classIds.length > 0
      ? await supabase.from("attendance").select("class_id, attended").eq("student_id", studentId).in("class_id", classIds)
      : { data: [] as any[] };
    const attendedByClass = new Map((att ?? []).map((a: any) => [a.class_id, a.attended]));

    const regRows: RegRow[] = (rs ?? [])
      .filter((r: any) => r.classes)
      .map((r: any) => ({
        id: r.id,
        class_id: r.class_id,
        title: r.classes.title,
        class_date: r.classes.class_date,
        class_time: r.classes.class_time,
        status: r.status,
        guest_count: r.guest_count ?? 0,
        payment_type: r.payment_type,
        pass_id: r.pass_id,
        attended: attendedByClass.get(r.class_id) ?? false,
      }));
    setRegs(regRows);

    const { data: orders } = await supabase
      .from("merch_orders")
      .select("id, created_at, amount_paid_cents, merch_products(title)")
      .eq("student_id", studentId)
      .eq("status", "paid");
    setMerch((orders ?? []).map((o: any) => ({
      id: o.id, created_at: o.created_at, amount_paid_cents: o.amount_paid_cents,
      title: o.merch_products?.title ?? "Merch item",
    })));

    const { data: n } = await supabase.from("member_notes").select("*").eq("student_id", studentId).maybeSingle();
    setNote(n ?? null);
    setNoteDraft(n?.note ?? "");

    setLoading(false);
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(c => (c === key ? null : c)), 1500);
    }).catch(() => {});
  }

  // ---- Assign pass ----
  function openAssignPass() {
    setAssignPassTypeId(passTypes[0]?.id ?? "");
    setAssignPassSource("cash");
    setAssignPassAmount("");
    setAssignPassClassesRemaining("");
    setAssignPassError("");
    setShowAssignPass(true);
  }

  async function submitAssignPass(e: React.FormEvent) {
    e.preventDefault();
    setAssignPassLoading(true);
    setAssignPassError("");
    const res = await fetch("/api/instructor/assign-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        passTypeId: assignPassTypeId,
        source: assignPassSource,
        amountPaidCents: assignPassAmount ? Math.round(parseFloat(assignPassAmount) * 100) : null,
        classesRemaining: assignPassClassesRemaining ? parseInt(assignPassClassesRemaining, 10) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAssignPassError(data.error ?? "Failed to assign pass");
      setAssignPassLoading(false);
      return;
    }
    setShowAssignPass(false);
    setAssignPassLoading(false);
    loadAll();
  }

  function debitPass(passId: string) {
    setConfirmDialog({
      message: "Debit 1 class from this pass?",
      action: async () => {
        setDebitingPassId(passId);
        setPassActionError("");
        const res = await fetch("/api/instructor/debit-pass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passId }),
        });
        if (res.ok) { await loadAll(); } else {
          const data = await res.json();
          setPassActionError(data.error ?? "Something went wrong");
        }
        setDebitingPassId(null);
      },
    });
  }

  function deletePassAction(passId: string) {
    setConfirmDialog({
      message: "Delete this pass? This cannot be undone.",
      confirmLabel: "Delete",
      action: async () => {
        setDeletingPassId(passId);
        setPassActionError("");
        const res = await fetch("/api/instructor/delete-pass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passId }),
        });
        if (res.ok) { await loadAll(); } else {
          const data = await res.json();
          setPassActionError(data.error ?? "Something went wrong");
        }
        setDeletingPassId(null);
      },
    });
  }

  // ---- Edit details ----
  function openEdit() {
    if (!student) return;
    const bd = student.birth_date ?? "";
    const parts = bd ? bd.split("-") : [];
    const [bMonth, bDay] = parts.length === 3 ? [parts[1], parts[2]] : ["", ""];
    setEditForm({
      full_name: student.full_name ?? "",
      phone: student.phone ?? "",
      birth_month: bMonth ? String(parseInt(bMonth)) : "",
      birth_day: bDay ? String(parseInt(bDay)) : "",
    });
    setEditError("");
    setShowEdit(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    if (!isValidPhone(editForm.phone)) { setEditError("Please enter a valid phone number."); return; }
    setEditLoading(true);
    const birth_date = editForm.birth_month && editForm.birth_day
      ? `2000-${editForm.birth_month.padStart(2, "0")}-${editForm.birth_day.padStart(2, "0")}`
      : null;
    const res = await fetch("/api/instructor/update-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, full_name: editForm.full_name, phone: editForm.phone, birth_date }),
    });
    const data = await res.json();
    setEditLoading(false);
    if (!res.ok) { setEditError(data.error ?? "Something went wrong"); return; }
    setShowEdit(false);
    loadAll();
  }

  // ---- Remove member ----
  function removeMember() {
    if (!student) return;
    setConfirmDialog({
      message: `Remove ${student.full_name ?? student.email} from the app? This permanently deletes their account, bookings, passes, and chat history. This cannot be undone.`,
      confirmLabel: "Remove",
      action: async () => {
        setRemoveError("");
        const res = await fetch("/api/instructor/delete-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        });
        if (res.ok) {
          router.push("/instructor?tab=students");
        } else {
          const data = await res.json();
          setRemoveError(data.error ?? "Something went wrong");
        }
      },
    });
  }

  // ---- Notes ----
  async function saveNote() {
    setNoteSaving(true);
    setNoteError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("member_notes").upsert({
      student_id: studentId,
      note: noteDraft || null,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    });
    setNoteSaving(false);
    if (error) { setNoteError(error.message); return; }
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e4c3cc]">
        <p className="font-body text-gray-500">Loading…</p>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full text-center">
          <p className="font-body text-gray-500 mb-4">Member not found.</p>
          <Link href="/instructor?tab=students" className="btn-secondary">← Back to Members</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const today = todayLocal();
  const activePasses = passes.filter(p => p.classes_remaining > 0 && (!p.expires_at || new Date(p.expires_at) > new Date()));
  const inactivePasses = passes.filter(p => !activePasses.includes(p));
  const classesAttended = regs.filter(r => r.attended).length;
  const noShows = regs.filter(r => r.status !== "cancelled" && r.class_date < today && !r.attended).length;
  const lifetimeValueCents =
    passes.reduce((sum, p) => sum + (p.amount_paid_cents ?? p.pass_types?.price_cents ?? 0), 0) +
    merch.reduce((sum, m) => sum + (m.amount_paid_cents ?? 0), 0);

  const attendedSorted = regs.filter(r => r.attended).sort((a, b) => (a.class_date + a.class_time < b.class_date + b.class_time ? 1 : -1));
  const lastVisit = attendedSorted[0];
  const daysSinceLastVisit = lastVisit
    ? Math.floor((new Date(today + "T00:00:00").getTime() - new Date(lastVisit.class_date + "T00:00:00").getTime()) / 86400000)
    : null;

  // Which pass (if any) actually funded a given registration — casual/double
  // bookings get their own one-off pass row created alongside them, so the
  // money for those lives there, not on the registration itself.
  function passForReg(reg: RegRow): PassWithType | undefined {
    return reg.pass_id ? passes.find(p => p.id === reg.pass_id) : undefined;
  }

  function classChip(reg: RegRow): string {
    if (reg.payment_type === "complimentary") return "Complimentary";
    const pass = passForReg(reg);
    if (reg.payment_type === "pass") return pass?.pass_types?.name ?? "Pass";
    const src = sourceMeta(pass?.source ?? null);
    const amount = pass?.amount_paid_cents;
    const fallbackLabel = reg.payment_type === "double" ? "Double Pass" : "Casual";
    return amount != null ? `${src.label} · ${formatPrice(amount)}` : fallbackLabel;
  }

  const events: TimelineEvent[] = [
    { kind: "joined" as const, sortKey: student.created_at },
    ...passes.map(p => ({ kind: "pass" as const, sortKey: p.created_at, pass: p })),
    ...regs.map(r => ({ kind: "class" as const, sortKey: `${r.class_date}T${r.class_time}`, reg: r })),
    ...merch.map(o => ({ kind: "merch" as const, sortKey: o.created_at, order: o })),
  ].sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

  let lastMonth = "";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <Link href="/instructor?tab=students" className="font-body text-sm text-[#2041d8] hover:underline inline-flex items-center gap-1 mb-5">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} /> Members
        </Link>

        {/* PROFILE HEADER */}
        <div className="card p-6 sm:p-8 shadow-lg shadow-black/5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-full bg-[#e4c3cc]/50 flex items-center justify-center text-xl font-heading overflow-hidden shrink-0">
                {student.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.avatar_url} alt="" className="object-cover w-full h-full" />
                ) : (
                  (student.full_name ?? student.email)[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-heading text-2xl truncate">{student.full_name ?? "—"}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="badge bg-gray-100 text-gray-500">
                    Member since {new Date(student.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {student.filming_policy_accepted_at && (
                    <span
                      className="badge-confirmed"
                      title={`Accepted the Terms & Conditions on ${new Date(student.filming_policy_accepted_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`}
                    >
                      Terms & Conditions accepted
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              <button onClick={openAssignPass} className="btn-primary py-2 px-4 text-sm">+ Assign Pass</button>
              <button onClick={openEdit} className="btn-secondary py-2 px-4 text-sm">Edit Details</button>
              <button onClick={removeMember} className="font-body text-xs text-red-500 hover:underline self-center">Remove</button>
            </div>
          </div>

          {removeError && <p className="font-body text-sm text-red-500 mt-3">{removeError}</p>}

          <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t border-gray-100">
            <div>
              <p className="label">Phone</p>
              <p className="font-body text-sm font-medium flex items-center gap-2">
                {student.phone ?? "—"}
                {student.phone && (
                  <button onClick={() => copy(student.phone!, "phone")} className="text-[10px] font-heading text-[#2041d8] bg-[#a3bdfe]/30 rounded px-1.5 py-0.5">
                    {copied === "phone" ? "Copied" : "Copy"}
                  </button>
                )}
              </p>
            </div>
            <div>
              <p className="label">Email</p>
              <p className="font-body text-sm font-medium flex items-center gap-2">
                {student.email}
                <button onClick={() => copy(student.email, "email")} className="text-[10px] font-heading text-[#2041d8] bg-[#a3bdfe]/30 rounded px-1.5 py-0.5">
                  {copied === "email" ? "Copied" : "Copy"}
                </button>
              </p>
            </div>
            {student.birth_date && (
              <div>
                <p className="label">Birthday</p>
                <p className="font-body text-sm font-medium inline-flex items-center gap-1">
                  <Cake className="w-3.5 h-3.5 text-[#2041d8]" strokeWidth={1.75} />
                  {new Date(student.birth_date).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
          <div className="card p-4 shadow-sm shadow-black/5">
            <p className="label">Lifetime value</p>
            <p className="font-heading text-xl mt-1.5">{formatPrice(lifetimeValueCents)}</p>
            <p className="font-body text-xs text-gray-400 mt-1">
              {classesAttended} class{classesAttended !== 1 ? "es" : ""}{merch.length > 0 ? ` + ${merch.length} merch` : ""}
            </p>
          </div>
          <div className="card p-4 shadow-sm shadow-black/5">
            <p className="label">Classes attended</p>
            <p className="font-heading text-xl mt-1.5">{classesAttended}</p>
          </div>
          <div className="card p-4 shadow-sm shadow-black/5">
            <p className="label">No-shows</p>
            <p className="font-heading text-xl mt-1.5">{noShows}</p>
          </div>
          <div className="card p-4 shadow-sm shadow-black/5">
            <p className="label">Active pass</p>
            <p className="font-heading text-xl mt-1.5">
              {activePasses.length === 0 ? "None" : `${activePasses[0].classes_remaining} left`}
            </p>
            <p className="font-body text-xs text-gray-400 mt-1 truncate">
              {activePasses.length === 0 ? "—" : activePasses[0].pass_types?.name}
              {activePasses.length > 1 ? ` +${activePasses.length - 1} more` : ""}
            </p>
          </div>
          <div className="card p-4 shadow-sm shadow-black/5">
            <p className="label">Last visit</p>
            <p className="font-heading text-xl mt-1.5">
              {daysSinceLastVisit === null ? "Never" : daysSinceLastVisit === 0 ? "Today" : daysSinceLastVisit === 1 ? "Yesterday" : `${daysSinceLastVisit}d ago`}
            </p>
            {lastVisit && <p className="font-body text-xs text-gray-400 mt-1 truncate">{lastVisit.title}</p>}
          </div>
        </div>

        {/* TABS */}
        <div className="overflow-x-auto mt-9 -mx-1 px-1 border-b border-[#2041d8]/20">
          <div className="inline-flex items-center gap-1 w-max pb-3">
            {([
              ["timeline", "Activity Timeline"],
              ["passes", "Passes & Purchases"],
              ["notes", "Notes"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`font-body text-sm px-4 py-2 rounded-full whitespace-nowrap transition-colors ${tab === key ? "bg-[#2041d8] text-white" : "text-gray-500 hover:text-black hover:bg-black/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* TIMELINE */}
        {tab === "timeline" && (
          <div className="mt-7">
            {events.length === 0 ? (
              <p className="font-body text-sm text-gray-400">No activity yet.</p>
            ) : (
              <div className="relative pl-6 border-l-2 border-[#2041d8]/15 flex flex-col gap-5">
                {events.map((ev, i) => {
                  const month = monthLabel(ev.kind === "class" ? `${ev.reg.class_date}T00:00:00` : ev.sortKey);
                  const showMonth = month !== lastMonth;
                  lastMonth = month;

                  let dotClass = "border-[#2041d8] bg-[#fff8f3]";
                  let title = "";
                  let when = "";
                  let chip: string | null = null;
                  let attendanceBadge: { label: string; cls: string } | null = null;

                  if (ev.kind === "joined") {
                    title = "Joined THE A.M";
                    when = new Date(ev.sortKey).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
                    dotClass = "border-gray-300 bg-[#fff8f3]";
                  } else if (ev.kind === "pass") {
                    const src = sourceMeta(ev.pass.source);
                    title = `${ev.pass.pass_types?.name ?? "Pass"} — ${ev.pass.classes_total} class${ev.pass.classes_total !== 1 ? "es" : ""}`;
                    when = new Date(ev.sortKey).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
                    chip = `${src.label} · ${formatPrice(ev.pass.amount_paid_cents ?? ev.pass.pass_types?.price_cents ?? 0)}`;
                  } else if (ev.kind === "merch") {
                    title = `Bought ${ev.order.title}`;
                    when = new Date(ev.sortKey).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
                    chip = formatPrice(ev.order.amount_paid_cents ?? 0);
                    dotClass = "border-gray-300 bg-[#fff8f3]";
                  } else {
                    const r = ev.reg;
                    const isPast = r.class_date < today;
                    const cancelled = r.status === "cancelled";
                    title = r.title + (r.guest_count > 0 ? ` (+${r.guest_count} guest)` : "");
                    when = `${new Date(r.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} · ${formatTime(r.class_time)}`;
                    chip = classChip(r);
                    if (cancelled) {
                      attendanceBadge = { label: "Cancelled", cls: "badge bg-gray-100 text-gray-500" };
                      dotClass = "border-gray-300 bg-[#fff8f3]";
                    } else if (!isPast) {
                      attendanceBadge = { label: "Upcoming", cls: "badge-confirmed" };
                    } else if (r.attended) {
                      attendanceBadge = { label: "Attended", cls: "badge-confirmed" };
                      dotClass = "border-green-600 bg-[#fff8f3]";
                    } else {
                      attendanceBadge = { label: "No-show", cls: "badge bg-red-50 text-red-500" };
                      dotClass = "border-red-400 bg-[#fff8f3]";
                    }
                  }

                  return (
                    <div key={`${ev.kind}-${i}`} className="relative">
                      {showMonth && (
                        <p className="font-heading text-xs uppercase tracking-widest text-gray-400 -ml-6 pl-6 mb-3 first:mt-0 mt-1">{month}</p>
                      )}
                      <span className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 ${dotClass}`} />
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-body text-sm font-medium truncate">{title}</p>
                          <p className="font-body text-xs text-gray-400 mt-0.5">{when}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                          {chip && <span className="text-xs font-body font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1 whitespace-nowrap">{chip}</span>}
                          {attendanceBadge && <span className={attendanceBadge.cls}>{attendanceBadge.label}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PASSES & PURCHASES */}
        {tab === "passes" && (
          <div className="mt-7">
            <p className="font-body text-xs text-gray-400 mb-4">
              Casual drop-ins aren't stored as passes — see the Timeline tab for those. This is only the pass purchases and assignments on file.
            </p>
            {passActionError && <p className="font-body text-sm text-red-500 mb-3">{passActionError}</p>}
            {passes.length === 0 ? (
              <p className="font-body text-sm text-gray-400">No passes yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {[...activePasses, ...inactivePasses].map(p => {
                  const expired = !!p.expires_at && new Date(p.expires_at) < new Date();
                  const used = p.classes_remaining === 0;
                  const status = expired ? "Expired" : used ? "Used up" : "Active";
                  const statusClass = expired || used ? "badge bg-gray-100 text-gray-500" : "badge-confirmed";
                  const isActive = !expired && !used;
                  const src = sourceMeta(p.source);
                  return (
                    <div key={p.id} className="card shadow-sm shadow-black/5 px-4 py-3.5 flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-body font-medium">{p.pass_types?.name ?? p.pass_type_id}</p>
                        <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                          <span className="text-xs font-body text-gray-500">
                            {new Date(p.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className="text-xs font-body text-gray-500 inline-flex items-center gap-1">
                            <src.icon className="w-3 h-3" strokeWidth={2} /> {src.label} · {formatPrice(p.amount_paid_cents ?? p.pass_types?.price_cents ?? 0)}
                          </span>
                          <span className="text-xs font-body text-gray-500">{p.classes_remaining}/{p.classes_total} left</span>
                          <span className="text-xs font-body text-gray-500">
                            {p.expires_at ? new Date(p.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "No expiry"}
                          </span>
                          <span className={statusClass}>{status}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isActive && (
                          <button
                            onClick={() => debitPass(p.id)}
                            disabled={debitingPassId === p.id}
                            className="font-body text-xs text-[#2041d8] hover:underline disabled:opacity-50"
                          >
                            {debitingPassId === p.id ? "…" : "Debit 1"}
                          </button>
                        )}
                        <button
                          onClick={() => deletePassAction(p.id)}
                          disabled={deletingPassId === p.id}
                          className="font-body text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingPassId === p.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NOTES */}
        {tab === "notes" && (
          <div className="mt-7">
            <div className="card shadow-sm shadow-black/5 p-6">
              <p className="font-body text-xs text-gray-400 mb-3">Visible to instructors only — never shown to {student.full_name?.split(" ")[0] ?? "the member"}.</p>
              <textarea
                className="input min-h-[120px]"
                placeholder="e.g. Prefers front row. Recovering from an ankle injury — modify jumps."
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
              />
              {note?.updated_at && (
                <p className="font-body text-xs text-gray-400 mt-2">
                  Last updated {new Date(note.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              {noteError && <p className="font-body text-sm text-red-500 mt-2">{noteError}</p>}
              {noteSaved && <p className="font-body text-sm text-green-600 mt-2">Saved.</p>}
              <button onClick={saveNote} disabled={noteSaving} className="btn-primary py-2 px-5 text-sm mt-4">
                {noteSaving ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />

      {/* ASSIGN PASS MODAL */}
      {showAssignPass && (
        <Modal title={`Assign Pass — ${student.full_name ?? student.email}`} onClose={() => setShowAssignPass(false)}>
          <form onSubmit={submitAssignPass} className="space-y-4">
            <p className="font-body text-sm text-gray-500">
              This assigns a pass directly to the student without payment going through Stripe.
            </p>
            <div>
              <label className="label">Pass Type</label>
              <select className="input" value={assignPassTypeId} onChange={e => setAssignPassTypeId(e.target.value)} required>
                {passTypes.map(pt => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name} — {pt.classes_included} class{(pt.classes_included ?? 0) !== 1 ? "es" : ""} · ${(pt.price_cents / 100).toFixed(0)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Classes remaining
                <span className="font-body text-xs text-gray-400 ml-1">(optional — for a part-used pass)</span>
              </label>
              <input
                className="input"
                type="number"
                min="0"
                max={passTypes.find(pt => pt.id === assignPassTypeId)?.classes_included ?? undefined}
                placeholder={`Leave blank for the full ${passTypes.find(pt => pt.id === assignPassTypeId)?.classes_included ?? ""} classes`}
                value={assignPassClassesRemaining}
                onChange={e => setAssignPassClassesRemaining(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={assignPassSource} onChange={e => setAssignPassSource(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card_manual">Card (manual)</option>
                <option value="complimentary">Complimentary</option>
              </select>
            </div>
            {assignPassSource !== "complimentary" && (
              <div>
                <label className="label">
                  Amount paid (AUD)
                  {passTypes.find(pt => pt.id === assignPassTypeId) && (
                    <span className="font-body text-xs text-gray-400 ml-1">
                      — full price ${(passTypes.find(pt => pt.id === assignPassTypeId)!.price_cents / 100).toFixed(0)}
                    </span>
                  )}
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 130.00"
                  value={assignPassAmount}
                  onChange={e => setAssignPassAmount(e.target.value)}
                />
                <p className="font-body text-xs text-gray-400 mt-1">Leave blank to use full price.</p>
              </div>
            )}
            {assignPassError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">{assignPassError}</div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAssignPass(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center" disabled={assignPassLoading}>
                {assignPassLoading ? "Assigning…" : "Assign Pass"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT DETAILS MODAL */}
      {showEdit && (
        <Modal title="Edit Member Details" onClose={() => setShowEdit(false)}>
          <form onSubmit={submitEdit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" type="text" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" placeholder="+61 4xx xxx xxx" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Birthday</label>
              <div className="flex gap-2">
                <select className="input flex-1" value={editForm.birth_month} onChange={e => setEditForm(f => ({ ...f, birth_month: e.target.value }))}>
                  <option value="">Month</option>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <select className="input w-28" value={editForm.birth_day} onChange={e => setEditForm(f => ({ ...f, birth_day: e.target.value }))}>
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">{editError}</div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center" disabled={editLoading}>
                {editLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => { const action = confirmDialog.action; setConfirmDialog(null); action(); }}
        />
      )}
    </div>
  );
}
