"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice, getYouTubeId } from "@/lib/stripe";
import type { Class, Pass, PassType, Playlist, Profile, Video } from "@/lib/supabase";
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
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTab, setActiveTab] = useState<"classes" | "attendance" | "videos" | "passes" | "students" | "playlists" | "discounts">("classes");
  const [selectedClass, setSelectedClass] = useState<ClassWithCount | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Create class form
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({ title: "", description: "", class_date: "", price_cents: "24", capacity: "20" });
  const [classFormLoading, setClassFormLoading] = useState(false);

  // Bulk create Fridays
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState({ title: "Morning Dance Class", description: "", price_cents: "24", capacity: "20", end_date: "2026-12-31" });
  const [bulkLoading, setBulkLoading] = useState(false);

  // Bulk import
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{ full_name: string; email: string; phone: string }[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ email: string; name: string; status: string; reason?: string }[] | null>(null);
  const [bulkParseError, setBulkParseError] = useState("");

  // Discount codes
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountForm, setDiscountForm] = useState({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "" });
  const [discountFormLoading, setDiscountFormLoading] = useState(false);

  // Playlist form
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({ title: "", description: "", spotify_url: "" });
  const [playlistFormLoading, setPlaylistFormLoading] = useState(false);

  // Video form
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: "", description: "", youtube_url: "", class_id: "", is_public: false });
  const [videoFormLoading, setVideoFormLoading] = useState(false);

  // Add student form
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState({ full_name: "", email: "", phone: "" });
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [addStudentError, setAddStudentError] = useState("");

  // Assign pass form
  const [showAssignPassForm, setShowAssignPassForm] = useState(false);
  const [assignPassTarget, setAssignPassTarget] = useState<Profile | null>(null);
  const [assignPassTypeId, setAssignPassTypeId] = useState("");
  const [assignPassSource, setAssignPassSource] = useState("cash");
  const [assignPassAmount, setAssignPassAmount] = useState("");
  const [assignPassLoading, setAssignPassLoading] = useState(false);

  // Debit pass
  const [debitingPassId, setDebitingPassId] = useState<string | null>(null);

  // Review emails
  const [sendingReviews, setSendingReviews] = useState(false);
  const [reviewsSent, setReviewsSent] = useState<number | null>(null);

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
      .order("class_date", { ascending: true });

    const { data: regCounts } = await supabase.from("class_registration_counts").select("*");

    const enriched = (classData ?? []).map((c) => ({
      ...c,
      registered_count: regCounts?.find((rc) => rc.class_id === c.id)?.registered_count ?? 0,
    }));
    setClasses(enriched);

    // Clear selectedClass if it's in the past (e.g. tab left open overnight)
    const todayStr = new Date().toISOString().split("T")[0];
    setSelectedClass(prev => {
      if (!prev) return null;
      if (prev.class_date < todayStr) return null;
      return enriched.find(c => c.id === prev.id) ?? null;
    });

    const { data: vids } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
    setVideos(vids ?? []);

    const { data: passes } = await supabase
      .from("passes")
      .select("*, pass_types(*), profiles(full_name, email)")
      .order("created_at", { ascending: false });
    setAllPasses((passes as PassRow[]) ?? []);

    const { data: studs } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("full_name", { ascending: true });
    setAllStudents((studs as Profile[]) ?? []);

    const { data: ptypes } = await supabase.from("pass_types").select("*").order("price_cents", { ascending: true });
    setPassTypes((ptypes as PassType[]) ?? []);

    const { data: pls } = await supabase.from("playlists").select("*").order("created_at", { ascending: false });
    setPlaylists((pls as Playlist[]) ?? []);

    const { data: dcs } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
    setDiscountCodes(dcs ?? []);

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
    setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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

  function parseCSV(text: string) {
    setBulkParseError("");
    setBulkResults(null);
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) { setBulkParseError("CSV must have a header row and at least one student."); return; }

    const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
    const firstNameIdx = header.findIndex(h => h === "first name" || h === "first_name" || h === "firstname");
    const lastNameIdx = header.findIndex(h => h === "last name" || h === "last_name" || h === "lastname" || h === "surname");
    const nameIdx = header.findIndex(h => h.includes("full") && h.includes("name"));
    const emailIdx = header.findIndex(h => h.includes("email"));
    const phoneIdx = header.findIndex(h => h.includes("phone"));

    const hasFullName = nameIdx !== -1;
    const hasSplitName = firstNameIdx !== -1 && lastNameIdx !== -1;

    if ((!hasFullName && !hasSplitName) || emailIdx === -1) {
      setBulkParseError("CSV must have columns: Full Name (or First Name + Last Name), Email.");
      return;
    }

    const students = lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
      const full_name = hasFullName
        ? (cols[nameIdx] ?? "")
        : `${cols[firstNameIdx] ?? ""} ${cols[lastNameIdx] ?? ""}`.trim();
      return {
        full_name,
        email: cols[emailIdx] ?? "",
        phone: phoneIdx >= 0 ? (cols[phoneIdx] ?? "") : "",
      };
    }).filter(s => s.email && s.full_name);

    setBulkPreview(students);
  }

  async function runBulkImport() {
    if (bulkPreview.length === 0) return;
    setBulkImporting(true);
    const res = await fetch("/api/instructor/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: bulkPreview }),
    });
    const data = await res.json();
    setBulkResults(data.results ?? []);
    setBulkImporting(false);
    loadData();
  }

  async function createDiscountCode(e: React.FormEvent) {
    e.preventDefault();
    setDiscountFormLoading(true);
    const { error } = await supabase.from("discount_codes").insert({
      code: discountForm.code.toUpperCase().trim(),
      discount_type: discountForm.discount_type,
      discount_value: discountForm.discount_type === "percentage"
        ? parseInt(discountForm.discount_value)
        : Math.round(parseFloat(discountForm.discount_value) * 100),
      max_uses: discountForm.max_uses ? parseInt(discountForm.max_uses) : null,
      expires_at: discountForm.expires_at || null,
      active: true,
    });
    if (error) { alert(error.message); setDiscountFormLoading(false); return; }
    setShowDiscountForm(false);
    setDiscountForm({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "" });
    loadData();
    setDiscountFormLoading(false);
  }

  async function toggleDiscountActive(id: string, active: boolean) {
    await supabase.from("discount_codes").update({ active: !active }).eq("id", id);
    setDiscountCodes(prev => prev.map(d => d.id === id ? { ...d, active: !active } : d));
  }

  async function deleteDiscountCode(id: string) {
    if (!confirm("Delete this discount code?")) return;
    await supabase.from("discount_codes").delete().eq("id", id);
    setDiscountCodes(prev => prev.filter(d => d.id !== id));
  }

  async function addPlaylist(e: React.FormEvent) {
    e.preventDefault();
    setPlaylistFormLoading(true);

    const match = playlistForm.spotify_url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) {
      alert("Invalid Spotify playlist URL. It should look like: https://open.spotify.com/playlist/...");
      setPlaylistFormLoading(false);
      return;
    }
    const spotify_id = match[1];

    await supabase.from("playlists").insert({
      title: playlistForm.title,
      description: playlistForm.description || null,
      spotify_url: playlistForm.spotify_url,
      spotify_id,
    });

    setShowPlaylistForm(false);
    setPlaylistForm({ title: "", description: "", spotify_url: "" });
    loadData();
    setPlaylistFormLoading(false);
  }

  async function deletePlaylist(id: string) {
    if (!confirm("Delete this playlist?")) return;
    await supabase.from("playlists").delete().eq("id", id);
    setPlaylists(p => p.filter(pl => pl.id !== id));
  }

  async function deleteVideo(id: string) {
    if (!confirm("Delete this video?")) return;
    await supabase.from("videos").delete().eq("id", id);
    setVideos((v) => v.filter((vid) => vid.id !== id));
  }

  async function inviteStudent(e: React.FormEvent) {
    e.preventDefault();
    setAddStudentLoading(true);
    setAddStudentError("");

    const res = await fetch("/api/instructor/create-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addStudentForm),
    });
    const data = await res.json();

    if (!res.ok) {
      setAddStudentError(data.error ?? "Something went wrong");
      setAddStudentLoading(false);
      return;
    }

    setShowAddStudentForm(false);
    setAddStudentForm({ full_name: "", email: "", phone: "" });
    loadData();
    setAddStudentLoading(false);
  }

  async function assignPass(e: React.FormEvent) {
    e.preventDefault();
    if (!assignPassTarget || !assignPassTypeId) return;
    setAssignPassLoading(true);

    const res = await fetch("/api/instructor/assign-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: assignPassTarget.id,
        passTypeId: assignPassTypeId,
        source: assignPassSource,
        amountPaidCents: assignPassAmount ? Math.round(parseFloat(assignPassAmount) * 100) : null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error ?? "Failed to assign pass");
      setAssignPassLoading(false);
      return;
    }

    setShowAssignPassForm(false);
    setAssignPassTarget(null);
    setAssignPassTypeId("");
    setAssignPassAmount("");
    loadData();
    setAssignPassLoading(false);
  }

  async function debitPass(passId: string) {
    if (!confirm("Debit 1 class from this pass?")) return;
    setDebitingPassId(passId);

    const res = await fetch("/api/instructor/debit-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passId }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error ?? "Failed to debit pass");
    } else {
      setAllPasses(prev =>
        prev.map(p => p.id === passId ? { ...p, classes_remaining: p.classes_remaining - 1 } : p)
      );
    }
    setDebitingPassId(null);
  }

  async function sendReviewEmails() {
    if (!selectedClass) return;
    setSendingReviews(true);
    setReviewsSent(null);
    const res = await fetch("/api/instructor/send-review-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClass.id }),
    });
    const data = await res.json();
    setReviewsSent(data.sent ?? 0);
    setSendingReviews(false);
  }

  function openAssignPass(student: Profile) {
    setAssignPassTarget(student);
    setAssignPassTypeId(passTypes[0]?.id ?? "");
    setAssignPassSource("cash");
    setAssignPassAmount("");
    setShowAssignPassForm(true);
  }

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
    { key: "videos", label: "Videos" },
    { key: "passes", label: "Passes" },
    { key: "students", label: "Members" },
    { key: "playlists", label: "Playlists" },
    { key: "discounts", label: "Discounts" },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fff8f3]">
        <div className="font-body text-gray-400">Loading…</div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const upcomingClasses = classes.filter(c => !c.is_cancelled && c.class_date >= today);
  const pastClasses = classes.filter(c => c.class_date < today || c.is_cancelled).reverse();
  const todaysClass = classes.find(c => !c.is_cancelled && c.class_date === today);

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
            <button onClick={() => setShowAddStudentForm(true)} className="btn-secondary py-2 px-4 text-sm">
              + Add Member
            </button>
            <button onClick={() => setShowPlaylistForm(true)} className="btn-secondary py-2 px-4 text-sm">
              + Add Playlist
            </button>
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

        {/* Today's class banner */}
        {todaysClass && (
          <div className="bg-[#2041d8] text-white rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-body text-xs uppercase tracking-widest text-[#e4c3cc] mb-1">Today's Class</p>
              <h2 className="font-heading text-lg">{todaysClass.title}</h2>
              <p className="font-body text-sm text-white/70 mt-0.5">
                7:00 AM · {todaysClass.registered_count}/{todaysClass.capacity} booked
              </p>
            </div>
            <button
              onClick={() => loadStudents(todaysClass)}
              className="bg-white text-[#2041d8] font-heading text-sm px-5 py-2.5 rounded-full hover:bg-[#e4c3cc] transition-colors shrink-0"
            >
              Take Roll →
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Upcoming classes", value: upcomingClasses.length, color: "bg-[#fff8f3]" },
            { label: "Total members", value: allStudents.length, color: "bg-[#fff8f3]" },
            { label: "Videos", value: videos.length, color: "bg-[#fff8f3]" },
            { label: "Active passes", value: allPasses.filter(p => p.classes_remaining > 0 && (!p.expires_at || new Date(p.expires_at) > new Date())).length, color: "bg-[#fff8f3]" },
          ].map((stat) => (
            <div key={stat.label} className={`card p-5 ${stat.color}`}>
              <p className="font-heading text-2xl">{stat.value}</p>
              <p className="font-body text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div ref={tabsRef} className="flex gap-1 mb-8 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`font-body text-sm px-4 py-2.5 -mb-px border-b-2 transition-colors whitespace-nowrap ${
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
                  <ClassRow key={cls.id} cls={cls} onAttendance={() => loadStudents(cls)} onCancel={() => cancelClass(cls)} isToday={cls.class_date === today} />
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
                {todaysClass && (
                  <button onClick={() => loadStudents(todaysClass)} className="btn-primary mt-4">
                    Load Today's Class
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setActiveTab("classes"); setSelectedClass(null); }} className="font-body text-sm text-gray-400 hover:text-black">
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
                  <div className="flex items-center gap-3 shrink-0">
                    {reviewsSent !== null && (
                      <p className="font-body text-sm text-green-600">
                        {reviewsSent === 0 ? "No first-timers today" : `${reviewsSent} review email${reviewsSent !== 1 ? "s" : ""} sent!`}
                      </p>
                    )}
                    <button
                      onClick={sendReviewEmails}
                      disabled={sendingReviews}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      {sendingReviews ? "Sending…" : "Send Review Emails"}
                    </button>
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="font-body text-gray-400">No registered members for this class.</p>
                  </div>
                ) : (
                  <div className="card overflow-hidden">
                    <div className="divide-y divide-gray-50">
                      {students.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="font-medium text-sm font-body">
                              {s.full_name ?? "—"}
                              {s.guest_count > 0 && (
                                <span className="ml-2 badge bg-[#e4c3cc]/50 text-black">+{s.guest_count} guest</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 font-body">{s.email}</p>
                          </div>
                          <button
                            onClick={() => toggleAttendance(s.id, s.attended)}
                            className={`w-8 h-8 rounded-full border-2 transition-all shrink-0 ${
                              s.attended
                                ? "bg-[#2041d8] border-[#2041d8] text-white"
                                : "border-gray-300 hover:border-[#2041d8]"
                            }`}
                          >
                            {s.attended ? "✓" : ""}
                          </button>
                        </div>
                      ))}
                    </div>
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
            {(() => {
              const activePasses = allPasses.filter(p => p.classes_remaining > 0 && (!p.expires_at || new Date(p.expires_at) > new Date()));
              const inactivePasses = allPasses.filter(p => p.classes_remaining === 0 || (p.expires_at && new Date(p.expires_at) <= new Date()));
              const PassList = ({ passes }: { passes: typeof allPasses }) => (
                <div className="card divide-y divide-gray-50 overflow-hidden">
                  {passes.map((p) => {
                    const expired = p.expires_at && new Date(p.expires_at) < new Date();
                    const used = p.classes_remaining === 0;
                    const isActive = !expired && !used;
                    const status = expired ? "Expired" : used ? "Used up" : "Active";
                    const statusClass = expired || used ? "badge bg-gray-100 text-gray-500" : "badge-confirmed";
                  return (
                    <div key={p.id} className="px-5 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm font-body">{p.profiles?.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-400 font-body">{p.profiles?.email}</p>
                        <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                          <span className="text-xs font-body text-gray-600">{(p as any).pass_types?.name ?? p.pass_type_id}</span>
                          <span className="text-xs font-body text-gray-500">{p.classes_remaining}/{p.classes_total} left</span>
                          <span className="text-xs font-body text-gray-500">
                            {p.expires_at ? new Date(p.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "No expiry"}
                          </span>
                          <span className={statusClass}>{status}</span>
                        </div>
                      </div>
                      {isActive && (
                        <button
                          onClick={() => debitPass(p.id)}
                          disabled={debitingPassId === p.id}
                          className="font-body text-xs text-[#2041d8] hover:underline disabled:opacity-50 shrink-0"
                        >
                          {debitingPassId === p.id ? "…" : "Debit 1"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              );
              return (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <p className="font-body text-sm text-gray-500">{activePasses.length} active · {inactivePasses.length} used/expired</p>
                  </div>
                  {activePasses.length === 0 ? (
                    <div className="card p-8 text-center mb-6">
                      <p className="font-body text-gray-400">No active passes.</p>
                    </div>
                  ) : (
                    <PassList passes={activePasses} />
                  )}
                  {inactivePasses.length > 0 && (
                    <>
                      <h3 className="font-heading text-xs uppercase tracking-widest text-gray-400 mt-8 mb-3">Used / Expired</h3>
                      <PassList passes={inactivePasses} />
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === "students" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-body text-sm text-gray-500">{allStudents.length} members</p>
              <div className="flex gap-2">
                <button onClick={() => { setShowBulkImport(true); setBulkPreview([]); setBulkResults(null); setBulkParseError(""); }} className="btn-secondary py-2 px-4 text-sm">
                  Import CSV
                </button>
                <button onClick={() => setShowAddStudentForm(true)} className="btn-primary py-2 px-4 text-sm">
                  + Invite Member
                </button>
              </div>
            </div>
            {allStudents.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400 mb-4">No members yet.</p>
                <button onClick={() => setShowAddStudentForm(true)} className="btn-primary">Invite Member</button>
              </div>
            ) : (
              <div className="card divide-y divide-gray-50 overflow-hidden">
                {allStudents.map((s) => (
                  <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm font-body">{s.full_name ?? "—"}</p>
                      <p className="text-xs text-gray-500 font-body">{s.email}</p>
                      <p className="text-xs text-gray-400 font-body">{s.phone ?? "—"} · {new Date(s.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <button
                      onClick={() => openAssignPass(s)}
                      className="font-body text-xs text-[#2041d8] hover:underline shrink-0"
                    >
                      Assign pass
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DISCOUNTS TAB */}
        {activeTab === "discounts" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-body text-sm text-gray-500">{discountCodes.length} code{discountCodes.length !== 1 ? "s" : ""}</p>
              <button onClick={() => setShowDiscountForm(true)} className="btn-primary py-2 px-4 text-sm">
                + New Code
              </button>
            </div>
            {discountCodes.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400 mb-4">No discount codes yet.</p>
                <button onClick={() => setShowDiscountForm(true)} className="btn-primary">Create Code</button>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm font-body">
                  <thead className="bg-[#fff8f3] border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Code</th>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Discount</th>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Uses</th>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Expires</th>
                      <th className="text-left px-5 py-3 font-heading text-xs uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {discountCodes.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-heading tracking-wider">{d.code}</td>
                        <td className="px-5 py-3">
                          {d.discount_type === "percentage"
                            ? `${d.discount_value}% off`
                            : `$${(d.discount_value / 100).toFixed(0)} off`}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {d.uses_count}{d.max_uses ? `/${d.max_uses}` : ""}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {d.expires_at ? new Date(d.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={d.active ? "badge-confirmed" : "badge bg-gray-100 text-gray-500"}>
                            {d.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right flex items-center gap-3 justify-end">
                          <button onClick={() => toggleDiscountActive(d.id, d.active)} className="font-body text-xs text-[#2041d8] hover:underline">
                            {d.active ? "Disable" : "Enable"}
                          </button>
                          <button onClick={() => deleteDiscountCode(d.id)} className="font-body text-xs text-red-400 hover:text-red-600">
                            Delete
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

        {/* PLAYLISTS TAB */}
        {activeTab === "playlists" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-body text-sm text-gray-500">{playlists.length} playlist{playlists.length !== 1 ? "s" : ""}</p>
              <button onClick={() => setShowPlaylistForm(true)} className="btn-primary py-2 px-4 text-sm">
                + Add Playlist
              </button>
            </div>
            {playlists.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400 mb-4">No playlists yet. Add your first Spotify playlist!</p>
                <button onClick={() => setShowPlaylistForm(true)} className="btn-primary">Add Playlist</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {playlists.map((p) => (
                  <div key={p.id} className="card overflow-hidden">
                    <iframe
                      src={`https://open.spotify.com/embed/playlist/${p.spotify_id}?utm_source=generator&theme=0`}
                      width="100%"
                      height="352"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="border-0"
                    />
                    <div className="p-5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-heading text-base mb-1">{p.title}</h3>
                        {p.description && (
                          <p className="font-body text-sm text-gray-500">{p.description}</p>
                        )}
                      </div>
                      <button onClick={() => deletePlaylist(p.id)} className="font-body text-xs text-red-400 hover:text-red-600 shrink-0">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
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
                  placeholder="What will members learn?"
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
                  Visible to all members (not just paid registrants)
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

        {/* CREATE DISCOUNT CODE MODAL */}
        {showDiscountForm && (
          <Modal title="New Discount Code" onClose={() => setShowDiscountForm(false)}>
            <form onSubmit={createDiscountCode} className="space-y-4">
              <div>
                <label className="label">Code</label>
                <input
                  className="input uppercase"
                  placeholder="e.g. WELCOME20"
                  value={discountForm.code}
                  onChange={e => setDiscountForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div>
                <label className="label">Discount Type</label>
                <select
                  className="input"
                  value={discountForm.discount_type}
                  onChange={e => setDiscountForm(f => ({ ...f, discount_type: e.target.value }))}
                >
                  <option value="percentage">Percentage (e.g. 20% off)</option>
                  <option value="fixed">Fixed amount (e.g. $10 off)</option>
                </select>
              </div>
              <div>
                <label className="label">
                  {discountForm.discount_type === "percentage" ? "Percentage off (0–100)" : "Amount off (AUD)"}
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max={discountForm.discount_type === "percentage" ? "100" : undefined}
                  step={discountForm.discount_type === "percentage" ? "1" : "0.01"}
                  placeholder={discountForm.discount_type === "percentage" ? "20" : "10.00"}
                  value={discountForm.discount_value}
                  onChange={e => setDiscountForm(f => ({ ...f, discount_value: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Max uses (optional)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={discountForm.max_uses}
                    onChange={e => setDiscountForm(f => ({ ...f, max_uses: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Expires (optional)</label>
                  <input
                    className="input"
                    type="date"
                    value={discountForm.expires_at}
                    onChange={e => setDiscountForm(f => ({ ...f, expires_at: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDiscountForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={discountFormLoading}>
                  {discountFormLoading ? "Creating…" : "Create Code"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ADD PLAYLIST MODAL */}
        {showPlaylistForm && (
          <Modal title="Add Playlist" onClose={() => setShowPlaylistForm(false)}>
            <form onSubmit={addPlaylist} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  placeholder="e.g. Friday Vibes – Afro & Latin"
                  value={playlistForm.title}
                  onChange={e => setPlaylistForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Spotify Playlist URL</label>
                <input
                  className="input"
                  placeholder="https://open.spotify.com/playlist/..."
                  value={playlistForm.spotify_url}
                  onChange={e => setPlaylistForm(f => ({ ...f, spotify_url: e.target.value }))}
                  required
                />
                <p className="font-body text-xs text-gray-400 mt-1">
                  Open Spotify → right-click your playlist → Share → Copy link
                </p>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="What style of music is this?"
                  value={playlistForm.description}
                  onChange={e => setPlaylistForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPlaylistForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={playlistFormLoading}>
                  {playlistFormLoading ? "Adding…" : "Add Playlist"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* BULK IMPORT MODAL */}
        {showBulkImport && (
          <Modal title="Import Members from CSV" onClose={() => setShowBulkImport(false)}>
            <div className="space-y-4">
              {!bulkResults ? (
                <>
                  <div className="bg-[#a3bdfe]/10 border border-[#a3bdfe]/40 rounded-xl p-4 font-body text-xs text-gray-600 leading-relaxed">
                    <p className="font-heading text-sm mb-2">CSV format required:</p>
                    <code className="block bg-white rounded p-2 text-xs">
                      Full Name,Email,Phone<br/>
                      Jane Smith,jane@example.com,0412345678<br/>
                      John Doe,john@example.com,
                    </code>
                    <p className="mt-2 text-gray-500">Phone column is optional. Each student will receive an invite email.</p>
                  </div>

                  <div>
                    <label className="label">Upload CSV file</label>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="block w-full font-body text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-heading file:bg-[#2041d8] file:text-white hover:file:bg-[#2041d8]/80 cursor-pointer"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => parseCSV(ev.target?.result as string);
                        reader.readAsText(file);
                      }}
                    />
                  </div>

                  {bulkParseError && <p className="font-body text-sm text-red-500">{bulkParseError}</p>}

                  {bulkPreview.length > 0 && (
                    <div>
                      <p className="font-body text-sm text-gray-600 mb-2">{bulkPreview.length} members found — preview:</p>
                      <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-xs font-body">
                          <thead className="bg-[#fff8f3] sticky top-0">
                            <tr>
                              <th className="text-left px-3 py-2 text-gray-500">Name</th>
                              <th className="text-left px-3 py-2 text-gray-500">Email</th>
                              <th className="text-left px-3 py-2 text-gray-500">Phone</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {bulkPreview.map((s, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2">{s.full_name}</td>
                                <td className="px-3 py-2 text-gray-500">{s.email}</td>
                                <td className="px-3 py-2 text-gray-400">{s.phone || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowBulkImport(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                    <button
                      onClick={runBulkImport}
                      disabled={bulkImporting || bulkPreview.length === 0}
                      className="btn-primary flex-1 justify-center"
                    >
                      {bulkImporting ? `Inviting ${bulkPreview.length} members…` : `Invite ${bulkPreview.length} Members`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {bulkResults.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 font-body text-sm">
                        <span>{r.name} <span className="text-gray-400 text-xs">({r.email})</span></span>
                        <span className={
                          r.status === "invited" ? "text-green-600 font-medium" :
                          r.status === "skipped" ? "text-gray-400" : "text-red-500"
                        }>
                          {r.status === "invited" ? "✓ Invited" : r.status === "skipped" ? "Already exists" : `✗ ${r.reason}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="font-body text-sm text-gray-500 pt-1">
                    {bulkResults.filter(r => r.status === "invited").length} invited ·{" "}
                    {bulkResults.filter(r => r.status === "skipped").length} skipped ·{" "}
                    {bulkResults.filter(r => r.status === "error").length} errors
                  </div>
                  <button onClick={() => setShowBulkImport(false)} className="btn-primary w-full justify-center">Done</button>
                </>
              )}
            </div>
          </Modal>
        )}

        {/* ADD STUDENT MODAL */}
        {showAddStudentForm && (
          <Modal title="Invite Member" onClose={() => { setShowAddStudentForm(false); setAddStudentError(""); }}>
            <form onSubmit={inviteStudent} className="space-y-4">
              <p className="font-body text-sm text-gray-500">
                The student will receive an email invitation to set up their password and join the club.
              </p>
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  placeholder="Jane Smith"
                  value={addStudentForm.full_name}
                  onChange={e => setAddStudentForm(f => ({ ...f, full_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="jane@example.com"
                  value={addStudentForm.email}
                  onChange={e => setAddStudentForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="+61 4xx xxx xxx"
                  value={addStudentForm.phone}
                  onChange={e => setAddStudentForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              {addStudentError && (
                <p className="font-body text-sm text-red-500">{addStudentError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddStudentForm(false); setAddStudentError(""); }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={addStudentLoading}>
                  {addStudentLoading ? "Sending invite…" : "Send Invite"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ASSIGN PASS MODAL */}
        {showAssignPassForm && assignPassTarget && (
          <Modal title={`Assign Pass — ${assignPassTarget.full_name ?? assignPassTarget.email}`} onClose={() => setShowAssignPassForm(false)}>
            <form onSubmit={assignPass} className="space-y-4">
              <p className="font-body text-sm text-gray-500">
                This assigns a pass directly to the student without payment. Use this to migrate existing clients.
              </p>
              <div>
                <label className="label">Pass Type</label>
                <select
                  className="input"
                  value={assignPassTypeId}
                  onChange={e => setAssignPassTypeId(e.target.value)}
                  required
                >
                  {passTypes.map(pt => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} — {pt.classes_included} class{(pt.classes_included ?? 0) !== 1 ? "es" : ""} · ${(pt.price_cents / 100).toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input"
                  value={assignPassSource}
                  onChange={e => setAssignPassSource(e.target.value)}
                >
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
                  <p className="font-body text-xs text-gray-400 mt-1">Leave blank to use full price. Enter discounted amount if applicable.</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignPassForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={assignPassLoading}>
                  {assignPassLoading ? "Assigning…" : "Assign Pass"}
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

function ClassRow({ cls, onAttendance, onCancel, past, isToday }: {
  cls: ClassWithCount;
  onAttendance: () => void;
  onCancel: () => void;
  past?: boolean;
  isToday?: boolean;
}) {
  return (
    <div className={`card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cls.is_cancelled ? "opacity-60" : ""} ${isToday ? "ring-2 ring-[#2041d8]" : ""}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          {cls.is_cancelled ? (
            <span className="badge badge-cancelled">Cancelled</span>
          ) : isToday ? (
            <span className="badge bg-[#2041d8] text-white">Today</span>
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
          <button onClick={onAttendance} className={`py-1.5 px-3 text-xs ${isToday ? "btn-primary" : "btn-secondary"}`}>
            {isToday ? "Take Roll" : "Attendance"}
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
            {video.is_public ? "Public" : "Members only"}
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
