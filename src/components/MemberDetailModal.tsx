"use client";

import { useEffect, useState } from "react";
import { X, Cake } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { todayLocal } from "@/lib/date";
import { formatTime } from "@/lib/stripe";
import type { Pass, Profile } from "@/lib/supabase";

type PassWithType = Pass & { pass_types?: { name: string } };

type HistoryRow = {
  reg_id: string;
  class_id: string;
  title: string;
  class_date: string;
  class_time: string;
  status: string;
  guest_count: number;
  attended: boolean;
};

export default function MemberDetailModal({
  student,
  passes,
  onClose,
  onDebitPass,
  onDeletePass,
  onAssignPass,
  debitingPassId,
  deletingPassId,
  deletePassError,
}: {
  student: Profile;
  passes: PassWithType[];
  onClose: () => void;
  onDebitPass: (passId: string) => void;
  onDeletePass: (passId: string) => void;
  onAssignPass: () => void;
  debitingPassId: string | null;
  deletingPassId: string | null;
  deletePassError: string;
}) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingHistory(true);
      const supabase = createClient();
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, class_id, status, guest_count, classes(title, class_date, class_time)")
        .eq("student_id", student.id);

      const classIds = (regs ?? []).map((r: any) => r.class_id);
      const { data: att } = classIds.length > 0
        ? await supabase.from("attendance").select("class_id, attended").eq("student_id", student.id).in("class_id", classIds)
        : { data: [] as any[] };
      const attendedByClass = new Map((att ?? []).map((a: any) => [a.class_id, a.attended]));

      const rows: HistoryRow[] = (regs ?? [])
        .filter((r: any) => r.classes)
        .map((r: any) => ({
          reg_id: r.id,
          class_id: r.class_id,
          title: r.classes.title,
          class_date: r.classes.class_date,
          class_time: r.classes.class_time,
          status: r.status,
          guest_count: r.guest_count ?? 0,
          attended: attendedByClass.get(r.class_id) ?? false,
        }))
        .sort((a, b) => (a.class_date + a.class_time < b.class_date + b.class_time ? 1 : -1));

      if (!cancelled) {
        setHistory(rows);
        setLoadingHistory(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [student.id]);

  const activePasses = passes.filter(p => p.classes_remaining > 0 && (!p.expires_at || new Date(p.expires_at) > new Date()));
  const inactivePasses = passes.filter(p => p.classes_remaining === 0 || (p.expires_at && new Date(p.expires_at) <= new Date()));
  const today = todayLocal();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#e4c3cc]/50 flex items-center justify-center text-sm font-heading overflow-hidden shrink-0">
              {student.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.avatar_url} alt="" className="object-cover w-full h-full" />
              ) : (
                (student.full_name ?? student.email)[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg truncate">{student.full_name ?? "—"}</h2>
              <p className="font-body text-xs text-gray-500 truncate">{student.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-gray-400 font-body inline-flex items-center gap-1 flex-wrap">
            {student.phone ?? "No phone"} · Joined {new Date(student.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            {student.birth_date && (
              <> · <Cake className="w-3 h-3 text-[#2041d8]" strokeWidth={1.75} /> {new Date(student.birth_date).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}</>
            )}
          </p>
          {student.filming_policy_accepted_at && (
            <span
              className="badge-confirmed mt-2 inline-block"
              title={`Accepted the Terms & Conditions on ${new Date(student.filming_policy_accepted_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`}
            >
              Terms & Conditions accepted
            </span>
          )}

          <div className="flex items-center justify-between mt-7 mb-3">
            <h3 className="font-heading text-xs uppercase tracking-widest text-gray-400">Passes</h3>
            <button onClick={onAssignPass} className="font-body text-xs text-[#2041d8] hover:underline">
              + Assign pass
            </button>
          </div>
          {deletePassError && <p className="font-body text-sm text-red-500 mb-3">{deletePassError}</p>}
          {passes.length === 0 ? (
            <p className="font-body text-sm text-gray-400">No passes yet.</p>
          ) : (
            <div className="card divide-y divide-gray-50 overflow-hidden">
              {[...activePasses, ...inactivePasses].map((p) => {
                const expired = !!p.expires_at && new Date(p.expires_at) < new Date();
                const used = p.classes_remaining === 0;
                const status = expired ? "Expired" : used ? "Used up" : "Active";
                const statusClass = expired || used ? "badge bg-gray-100 text-gray-500" : "badge-confirmed";
                const isActive = !expired && !used;
                return (
                  <div key={p.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-body">{p.pass_types?.name ?? p.pass_type_id}</p>
                      <div className="flex flex-wrap gap-2 mt-1 items-center">
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
                          onClick={() => onDebitPass(p.id)}
                          disabled={debitingPassId === p.id}
                          className="font-body text-xs text-[#2041d8] hover:underline disabled:opacity-50"
                        >
                          {debitingPassId === p.id ? "…" : "Debit 1"}
                        </button>
                      )}
                      <button
                        onClick={() => onDeletePass(p.id)}
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

          <h3 className="font-heading text-xs uppercase tracking-widest text-gray-400 mt-7 mb-3">Class history</h3>
          {loadingHistory ? (
            <p className="font-body text-sm text-gray-400">Loading…</p>
          ) : history.length === 0 ? (
            <p className="font-body text-sm text-gray-400">No bookings yet.</p>
          ) : (
            <div className="card divide-y divide-gray-50 overflow-hidden">
              {history.map((h) => {
                const isPast = h.class_date < today;
                const cancelled = h.status === "cancelled";
                const attendanceLabel = cancelled ? "Cancelled" : !isPast ? "Upcoming" : h.attended ? "Attended" : "No-show";
                const attendanceClass = cancelled
                  ? "badge bg-gray-100 text-gray-500"
                  : !isPast
                  ? "badge-confirmed"
                  : h.attended
                  ? "badge-confirmed"
                  : "badge bg-red-50 text-red-500";
                return (
                  <div key={h.reg_id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-body truncate">
                        {h.title}
                        {h.guest_count > 0 && (
                          <span className="ml-2 badge bg-[#e4c3cc]/50 text-black">+{h.guest_count} guest</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 font-body">
                        {new Date(h.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} · {formatTime(h.class_time)}
                      </p>
                    </div>
                    <span className={`${attendanceClass} shrink-0`}>{attendanceLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
