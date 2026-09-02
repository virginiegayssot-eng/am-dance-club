"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { todayLocal } from "@/lib/date";

type ClassOption = { id: string; title: string; class_date: string; is_cancelled: boolean };
type StudentOption = { id: string; full_name: string | null; email: string };

// Self-contained: fetches its own classes/students and owns all of its
// state, so it can be dropped into more than one page (the instructor
// dashboard's quick-send modal, and Marketing's Review Requests tab)
// without threading props through either page's larger state.
export default function ReviewRequestPanel() {
  const supabase = createClient();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);

  const [reviewMode, setReviewMode] = useState<"class" | "any">("class");
  const [reviewClassId, setReviewClassId] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [reviewCandidates, setReviewCandidates] = useState<StudentOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [sendErrors, setSendErrors] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      // lte("class_date", today) first, so the 60-row cap is spent on the
      // 60 most recent PAST classes — without it, bulk-created recurring
      // classes scheduled months into the future dominate an
      // order-by-desc-then-limit query, starving out (or entirely
      // replacing) the classes this tool actually needs to show.
      const { data: classData } = await supabase
        .from("classes")
        .select("id, title, class_date, is_cancelled")
        .lte("class_date", todayLocal())
        .order("class_date", { ascending: false })
        .limit(60);
      setClasses(classData ?? []);

      const { data: students } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "student")
        .order("full_name");
      setAllStudents(students ?? []);
    })();
  }, []);

  function switchMode(mode: "class" | "any") {
    setReviewMode(mode);
    setSent(null);
    setSendErrors([]);
    setSelectedIds(new Set());
    if (mode === "any") {
      setReviewClassId("");
      loadGenericPreview();
    } else {
      setPreviewHtml("");
      setReviewCandidates([]);
    }
  }

  async function loadGenericPreview() {
    setLoadingCandidates(true);
    const res = await fetch("/api/instructor/review-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generic: true }),
    });
    const data = await res.json();
    setPreviewHtml(data.previewHtml ?? "");
    setLoadingCandidates(false);
  }

  async function loadReviewCandidates(classId: string) {
    setReviewClassId(classId);
    setSent(null);
    setSendErrors([]);
    setLoadingCandidates(true);
    const res = await fetch("/api/instructor/review-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    const data = await res.json();
    setReviewCandidates(data.candidates ?? []);
    setSelectedIds(new Set((data.candidates ?? []).map((c: StudentOption) => c.id)));
    setPreviewHtml(data.previewHtml ?? "");
    setLoadingCandidates(false);
  }

  function toggleRecipient(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function confirmSend() {
    if (selectedIds.size === 0) return;
    if (reviewMode === "class" && !reviewClassId) return;
    setSending(true);
    const res = await fetch("/api/instructor/send-review-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        reviewMode === "any"
          ? { generic: true, studentIds: Array.from(selectedIds) }
          : { classId: reviewClassId, studentIds: Array.from(selectedIds) }
      ),
    });
    const data = await res.json();
    setSent(data.sent ?? 0);
    setSendErrors(data.errors ?? []);
    setSending(false);
  }

  const today = todayLocal();
  const pastClasses = classes.filter(c => c.class_date < today || c.is_cancelled);
  const todaysClass = classes.find(c => !c.is_cancelled && c.class_date === today);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border border-gray-200 rounded-xl p-1">
        <button
          type="button"
          onClick={() => switchMode("class")}
          className={`flex-1 py-1.5 rounded-lg font-body text-xs font-medium transition-colors ${reviewMode === "class" ? "bg-[#221f1c] text-white" : "text-gray-500"}`}
        >
          First-timers by class
        </button>
        <button
          type="button"
          onClick={() => switchMode("any")}
          className={`flex-1 py-1.5 rounded-lg font-body text-xs font-medium transition-colors ${reviewMode === "any" ? "bg-[#221f1c] text-white" : "text-gray-500"}`}
        >
          Any members
        </button>
      </div>

      {reviewMode === "class" ? (
        !reviewClassId ? (
          <div>
            <label className="label">Choose a class</label>
            <select
              className="input"
              defaultValue=""
              onChange={e => e.target.value && loadReviewCandidates(e.target.value)}
            >
              <option value="" disabled>Select a class…</option>
              {todaysClass && (
                <option value={todaysClass.id}>Today — {todaysClass.title}</option>
              )}
              {pastClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })} — {cls.title}
                </option>
              ))}
            </select>
          </div>
        ) : loadingCandidates ? (
          <p className="font-body text-sm text-gray-500">Loading…</p>
        ) : reviewCandidates.length === 0 ? (
          <p className="font-body text-sm text-gray-500">No first-time attendees eligible for a review email from this class.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-3">
            {reviewCandidates.map(c => (
              <label key={c.id} className="flex items-center gap-2 font-body text-sm">
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleRecipient(c.id)} />
                <span>{c.full_name ?? c.email}</span>
                <span className="text-xs text-gray-400">{c.email}</span>
              </label>
            ))}
          </div>
        )
      ) : (
        <>
          <p className="font-body text-sm text-gray-500">Select any members to send the review email to:</p>
          <input
            type="text"
            className="input"
            placeholder="Search members…"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
          />
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-3">
            {allStudents
              .filter(s => {
                const q = memberSearch.trim().toLowerCase();
                if (!q) return true;
                return (s.full_name ?? "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
              })
              .map(s => (
                <label key={s.id} className="flex items-center gap-2 font-body text-sm">
                  <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleRecipient(s.id)} />
                  <span>{s.full_name ?? s.email}</span>
                  <span className="text-xs text-gray-400">{s.email}</span>
                </label>
              ))}
          </div>
        </>
      )}

      {previewHtml && ((reviewMode === "class" && reviewClassId && reviewCandidates.length > 0) || reviewMode === "any") && (
        <>
          <div>
            <p className="font-body text-xs uppercase tracking-wide text-gray-400 mb-2">Preview</p>
            <div className="border border-gray-100 rounded-xl overflow-x-auto" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>

          {sent !== null && (
            <div className="space-y-1">
              <p className="font-body text-sm text-green-600">
                {sent === 0 ? "No emails sent." : `${sent} review email${sent !== 1 ? "s" : ""} sent successfully.`}
              </p>
              {sendErrors.length > 0 && (
                <p className="font-body text-sm text-red-500">{sendErrors.length} failed: {sendErrors.join("; ")}</p>
              )}
            </div>
          )}

          {sent === null && (
            <button
              type="button"
              onClick={confirmSend}
              disabled={sending || selectedIds.size === 0}
              className="btn-primary w-full justify-center"
            >
              {sending ? "Sending…" : `Send to ${selectedIds.size}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
