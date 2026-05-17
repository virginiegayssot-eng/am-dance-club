"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice, getYouTubeId } from "@/lib/stripe";
import type { Class, Pass, Profile, Video } from "@/lib/supabase";
import Link from "next/link";

type ClassWithCount = Class & { registered_count: number };
type StudentRow = { id: string; full_name: string | null; email: string; attended: boolean; reg_id: string; guest_count: number };
type PassRow = Pass & { profiles: { full_name: string | null; email: string } };

export default function InstructorPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [allPasses, setAllPasses] = useState<PassRow[]>([]);
  const [activeTab, setActiveTab] = useState<"classes" | "attendance" | "videos" | "passes">("classes");
  const [selectedClass, setSelectedClass] = useState<ClassWithCount | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create class form
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({ title: "", description: "", class_date: "", price_cents: "24", capacity: "20" });
  const [classFormLoading, setClassFormLoading] = useState(false);

  // Bulk create Fridays
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState({ title: "Morning Dance Class", description: "", price_cents: "24", capacity: "20", end_date: "2026-12-31" });
  const [bulkLoading, setBulkLoading] = useState(false);

  // Video form
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: "", description: "", youtube_url: "", class_id: "", is_public: false });
  const [videoFormLoading, setVideoFormLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (prof?.role !== "instructor") { router.push("/dashboard"); return; }
    setProfile(prof);

    const { data: classData } = await supabase
      .from("classes")
      .select("*")
      .order("class_date", { ascending: false });

    const { data: regCounts } = await supabase.from("class_registration_counts").select("*");

    const enriched = (classData ?? []).map((c) => ({
      ...c,
      registered_count: regCounts?.find((rc) => rc.class_id === c.id)?.registered_count ?? 0,
    }));
    setClasses(enriched);

    const { data: vids } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    setVideos(vids ?? []);

    const { data: passes } = await supabase
      .from("passes")
      .select("*, pass_types(*), profiles(full_name, email)")
      .order("created_at", { ascending: false });
    setAllPasses((passes as PassRow[]) ?? []);

    setLoading(false);
  }

  async function loadStudents(cls: ClassWithCount) {
    setSelectedClass(cls);
    const { data: regs } = await supabase
      .from("registrations")
      .select("id, student_id, profiles(id, full_name, email)")
      .eq("class_id", cls.id)
      .eq("status", "confirmed");

    const { data: att } = await supabase
      .from("attendance")
      .select("student_id, attended")
      .eq("class_id", cls.id);

    const rows: StudentRow[] = (regs ?? []).map((r: any) => ({
      id: r.profiles.id,
      full_name: r.profiles.full_name,
      email: r.profiles.email,
      attended: att?.find((a) => a.student_id === r.profiles.id)?.attended ?? false,
      reg_id: r.id,
      guest_count: r.guest_count ?? 0,
    }));
    setStudents(rows);
    setActiveTab("attendance");
  }

  async function toggleAttendance(studentId: string, attended: boolean) {
    if (!selectedClass) return;
    await supabase.from("attendance").upsert({
      class_id: selectedClass.id,
      student_id: studentId,
      attended: !attended,
    }, { onConflict: "class_id,student_id" });

    setStudents((prev) =>
      prev.map((s) => s.id === studentId ? { ...s, attended: !attended } : s)
    );
  }

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    setClassFormLoading(true);

    const { error } = await supabase.from("classes").insert({
      title: classForm.title,
      description: classForm.description || null,
      class_date: classForm.class_date,
      class_time: "07:00",
      price_cents: Math.round(parseFloat(classForm.price_cents) * 100),
      capacity: parseInt(classForm.capacity),
      instructor_id: profile!.id,
    });

    if (!error) {
      setShowClassForm(false);
      setClassForm({ title: "", description: "", class_date: "", price_cents: "20", capacity: "20" });
      loadData();
    }
    setClassFormLoading(false);
  }

  async function bulkCreateFridays(e: React.FormEvent) {
    e.preventDefault();
    setBulkLoading(true);

    const endDate = new Date(bulkForm.end_date + "T23:59:59");
    const fridays: string[] = [];
    const d = new Date();
    while (d <= endDate) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 5) fridays.push(d.toISOString().split("T")[0]);
    }

    // Skip dates that already have a class
    const existingDates = new Set(classes.map(c => c.class_date));
    const newFridays = fridays.filter(f => !existingDates.has(f));

    if (newFridays.length === 0) {
      alert("All those Fridays already have classes!");
      setBulkLoading(false);
      return;
    }

    const rows = newFridays.map(date => ({
      title: bulkForm.title,
      description: bulkForm.description || null,
      class_date: date,
      class_time: "07:00",
      price_cents: Math.round(parseFloat(bulkForm.price_cents) * 100),
      capacity: parseInt(bulkForm.capacity),
      instructor_id: profile!.id,
    }));

    const { error } = await supabase.from("classes").insert(rows);
    if (!error) {
      setShowBulkForm(false);
      loadData();
    } else {
      alert("Error creating classes: " + error.message);
    }
    setBulkLoading(false);
  }

  async function cancelClass(cls: ClassWithCount) {
    if (!confirm(`Cancel "${cls.title}"? This cannot be undone.`)) return;
    await supabase.from("classes").update({ is_cancelled: true }).eq("id", cls.id);
    loadData();
  }

  async function addVideo(e: React.FormEvent) {
    e.preventDefault();
    setVideoFormLoading(true);

    const youtubeId = getYouTubeId(videoForm.youtube_url);
    if (!youtubeId) {
      alert("Invalid YouTube URL");
      setVideoFormLoading(false);
      return;
    }

    await supabase.from("videos").insert({
      title: videoForm.title,
      description: videoForm.description || null,
      youtube_url: videoForm.youtube_url,
      youtube_id: youtubeId,
      class_id: videoForm.class_id || null,
      is_public: videoForm.is_public,
    });

    setShowVideoForm(false);
    setVideoForm({ title: "", description: "", youtube_url: "", class_id: "", is_public: false });
    loadData();
    setVideoFormLoading(false);
  }

  async function deleteVideo(id: string) {
    if (!confirm("Delete this video?")) return;
    await supabase.from("videos").delete().eq("id", id);
    setVideos((v) => v.filter((vid) => vid.id !== id));
  }

  // Get next few Fridays for the date picker
  function getNextFridays(count = 12) {
    const fridays: string[] = [];
    const d = new Date();
    while (fridays.length < count) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 5) {
        fridays.push(d.toISOString().split("T")[0]);
      }
    }
    return fridays;
  }

  const tabs = [
    { key: "classes", label: "Classes" },
    { key: "attendance", label: "Attendance" },
    { key: "videos", label: "Recordings" },
    { key: "passes", label: "Passes" },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff8f3]">
        <div className="font-body text-gray-400">Loading…</div>
      </div>
    );
  }

  const upcomingClasses = classes.filter(c => !c.is_cancelled && c.class_date >= new Date().toISOString().split("T")[0]);
  const pastClasses = classes.filter(c => c.class_date < new Date().toISOString().split("T")[0] || c.is_cancelled);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Instructor</p>
            <h1 className="section-title">Dashboard</h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setShowVideoForm(true)} className="btn-secondary py-2 px-4 text-sm">
              + Add Recording
            </button>
            <button onClick={() => setShowBulkForm(true)} className="btn-secondary py-2 px-4 text-sm">
              + Bulk Fridays
            </button>
            <button onClick={() => setShowClassForm(true)} className="btn-primary py-2 px-4 text-sm">
              + New Class
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Upcoming classes", value: upcomingClasses.length, color: "bg-[#fff8f3]" },
            { label: "Total students", value: classes.reduce((sum, c) => sum + c.registered_count, 0), color: "bg-[#fff8f3]" },
            { label: "Recordings", value: videos.length, color: "bg-[#fff8f3]" },
            { label: "Past classes", value: pastClasses.length, color: "bg-[#fff8f3]" },
          ].map((stat) => (
            <div key={stat.label} className={`card p-5 ${stat.color}`}>
              <p className="font-heading text-2xl">{stat.value}</p>
              <p className="font-body text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {tabs.map((tab) => (
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

        {/* CLASSES TAB */}
        {activeTab === "classes" && (
          <div>
            {upcomingClasses.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400 mb-4">No upcoming classes. Create one!</p>
                <button onClick={() => setShowClassForm(true)} className="btn-primary">New Class</button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-heading text-sm uppercase tracking-widest text-gray-400">Upcoming</h3>
                {upcomingClasses.map((cls) => (
                  <ClassRow key={cls.id} cls={cls} onAttendance={() => loadStudents(cls)} onCancel={() => cancelClass(cls)} />
                ))}
                {pastClasses.length > 0 && (
                  <>
                    <h3 className="font-heading text-sm uppercase tracking-widest text-gray-400 mt-8">Past</h3>
                    {pastClasses.slice(0, 5).map((cls) => (
                      <ClassRow key={cls.id} cls={cls} onAttendance={() => loadStudents(cls)} onCancel={() => cancelClass(cls)} past />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div>
            {!selectedClass ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400">Select a class from the Classes tab to mark attendance.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setActiveTab("classes")} className="font-body text-sm text-gray-400 hover:text-black">
                    ← Back
                  </button>
                  <div>
                    <h2 className="font-heading text-lg">{selectedClass.title}</h2>
                    <p className="font-body text-sm text-gray-500">
                      {new Date(selectedClass.class_date + "T00:00:00").toLocaleDateString("en-AU", {
                        weekday: "long", day: "numeric", month: "long"
                      })} · {students.filter(s => s.attended).length}/{students.length} attended
                    </p>
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="font-body text-gray-400">No registered students for this class.</p>
                  </div>
                ) : (
                  <div className="card overflow-hidden">
                    <table className="w-full text-sm font-body">
                      <thead className="bg-[#fff8f3] border-b border-gray-100">
                        <tr>
                          <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Student</th>
                          <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Email</th>
                          <th className="text-center px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Present</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {students.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-3 font-medium">
                              {s.full_name ?? "—"}
                              {s.guest_count > 0 && (
                                <span className="ml-2 badge bg-[#e4c3cc]/50 text-black">+{s.guest_count} guest</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-gray-500">{s.email}</td>
                            <td className="px-5 py-3 text-center">
                              <button
                                onClick={() => toggleAttendance(s.id, s.attended)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  s.attended
                                    ? "bg-[#2041d8] border-[#2041d8] text-white"
                                    : "border-gray-300 hover:border-[#2041d8]"
                                }`}
                              >
                                {s.attended ? "✓" : ""}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIDEOS TAB */}
        {activeTab === "videos" && (
          <div>
            {videos.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400 mb-4">No recordings yet. Add your first one!</p>
                <button onClick={() => setShowVideoForm(true)} className="btn-primary">Add Recording</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((v) => (
                  <VideoCard key={v.id} video={v} onDelete={() => deleteVideo(v.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASSES TAB */}
        {activeTab === "passes" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-body text-sm text-gray-500">{allPasses.length} passes purchased in total</p>
            </div>
            {allPasses.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400">No passes purchased yet.</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm font-body">
                  <thead className="bg-[#fff8f3] border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Student</th>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Pass</th>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Remaining</th>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Expires</th>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allPasses.map((p) => {
                      const expired = p.expires_at && new Date(p.expires_at) < new Date();
                      const used = p.classes_remaining === 0;
                      const status = expired ? "Expired" : used ? "Used up" : "Active";
                      const statusClass = expired || used ? "badge bg-gray-100 text-gray-500" : "badge-confirmed";
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3">
                            <p className="font-medium">{p.profiles?.full_name ?? "—"}</p>
                            <p className="text-gray-400 text-xs">{p.profiles?.email}</p>
                          </td>
                          <td className="px-5 py-3">{(p as any).pass_types?.name ?? p.pass_type_id}</td>
                          <td className="px-5 py-3">{p.classes_remaining}/{p.classes_total}</td>
                          <td className="px-5 py-3 text-gray-500">
                            {p.expires_at
                              ? new Date(p.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                              : "No expiry"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={statusClass}>{status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CREATE CLASS MODAL */}
        {showClassForm && (
          <Modal title="New Class" onClose={() => setShowClassForm(false)}>
            <form onSubmit={createClass} className="space-y-4">
              <div>
                <label className="label">Class Title</label>
                <input
                  className="input"
                  placeholder="e.g. Morning Dance – Beginners"
                  value={classForm.title}
                  onChange={e => setClassForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Date (Friday)</label>
                <select
                  className="input"
                  value={classForm.class_date}
                  onChange={e => setClassForm(f => ({ ...f, class_date: e.target.value }))}
                  required
                >
                  <option value="">Select a Friday</option>
                  {getNextFridays().map(d => (
                    <option key={d} value={d}>
                      {new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric"
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="What will students learn?"
                  value={classForm.description}
                  onChange={e => setClassForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Price (AUD)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="20.00"
                    value={classForm.price_cents}
                    onChange={e => setClassForm(f => ({ ...f, price_cents: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="20"
                    value={classForm.capacity}
                    onChange={e => setClassForm(f => ({ ...f, capacity: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowClassForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={classFormLoading}>
                  {classFormLoading ? "Creating…" : "Create Class"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* BULK CREATE FRIDAYS MODAL */}
        {showBulkForm && (
          <Modal title="Bulk Create Friday Classes" onClose={() => setShowBulkForm(false)}>
            <form onSubmit={bulkCreateFridays} className="space-y-4">
              <p className="font-body text-sm text-gray-500">Creates a class for every upcoming Friday that doesn't already have one.</p>
              <div>
                <label className="label">Class Title</label>
                <input
                  className="input"
                  placeholder="Morning Dance Class"
                  value={bulkForm.title}
                  onChange={e => setBulkForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  value={bulkForm.description}
                  onChange={e => setBulkForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Create classes until</label>
                <input
                  className="input"
                  type="date"
                  value={bulkForm.end_date}
                  onChange={e => setBulkForm(f => ({ ...f, end_date: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price (AUD)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkForm.price_cents}
                    onChange={e => setBulkForm(f => ({ ...f, price_cents: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={bulkForm.capacity}
                    onChange={e => setBulkForm(f => ({ ...f, capacity: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBulkForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={bulkLoading}>
                  {bulkLoading ? "Creating…" : "Create all Fridays"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ADD VIDEO MODAL */}
        {showVideoForm && (
          <Modal title="Add Recording" onClose={() => setShowVideoForm(false)}>
            <form onSubmit={addVideo} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  placeholder="e.g. Friday 16 May – Salsa Basics"
                  value={videoForm.title}
                  onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">YouTube URL</label>
                <input
                  className="input"
                  placeholder="https://youtube.com/watch?v=..."
                  value={videoForm.youtube_url}
                  onChange={e => setVideoForm(f => ({ ...f, youtube_url: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="What's covered in this recording?"
                  value={videoForm.description}
                  onChange={e => setVideoForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Link to Class (optional)</label>
                <select
                  className="input"
                  value={videoForm.class_id}
                  onChange={e => setVideoForm(f => ({ ...f, class_id: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.title} · {new Date(c.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={videoForm.is_public}
                  onChange={e => setVideoForm(f => ({ ...f, is_public: e.target.checked }))}
                  className="w-4 h-4 accent-[#2041d8]"
                />
                <label htmlFor="is_public" className="font-body text-sm text-gray-700">
                  Visible to all students (not just paid registrants)
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowVideoForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={videoFormLoading}>
                  {videoFormLoading ? "Adding…" : "Add Recording"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ClassRow({ cls, onAttendance, onCancel, past }: {
  cls: ClassWithCount;
  onAttendance: () => void;
  onCancel: () => void;
  past?: boolean;
}) {
  return (
    <div className={`card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cls.is_cancelled ? "opacity-60" : ""}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          {cls.is_cancelled ? (
            <span className="badge badge-cancelled">Cancelled</span>
          ) : past ? (
            <span className="badge badge bg-gray-100 text-gray-600">Past</span>
          ) : (
            <span className="badge-confirmed">Active</span>
          )}
        </div>
        <h3 className="font-heading text-base">{cls.title}</h3>
        <p className="font-body text-sm text-gray-500 mt-1">
          {new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
          })} · 7:00 AM
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center">
          <p className="font-heading text-base">{cls.registered_count}/{cls.capacity}</p>
          <p className="font-body text-xs text-gray-400">booked</p>
        </div>
        <div className="text-center">
          <p className="font-heading text-base">{formatPrice(cls.price_cents)}</p>
          <p className="font-body text-xs text-gray-400">per person</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onAttendance} className="btn-secondary py-1.5 px-3 text-xs">
            Attendance
          </button>
          {!cls.is_cancelled && !past && (
            <button onClick={onCancel} className="font-body text-xs text-red-400 hover:text-red-600 px-2">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video, onDelete }: { video: Video; onDelete: () => void }) {
  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-video bg-black">
        <img
          src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover opacity-80"
        />
        <a
          href={video.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-[#2041d8] ml-1" />
          </div>
        </a>
      </div>
      <div className="p-4">
        <h3 className="font-heading text-sm mb-1 line-clamp-1">{video.title}</h3>
        {video.description && (
          <p className="font-body text-xs text-gray-500 line-clamp-2 mb-3">{video.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className={`badge ${video.is_public ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {video.is_public ? "Public" : "Students only"}
          </span>
          <button onClick={onDelete} className="font-body text-xs text-red-400 hover:text-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-heading text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
