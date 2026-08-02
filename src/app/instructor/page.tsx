"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice, getYouTubeId } from "@/lib/stripe";
import type { Class, MerchProduct, Pass, PassType, Playlist, Profile, Video } from "@/lib/supabase";
import Link from "next/link";
import Linkify from "@/components/Linkify";
import { Cake, PartyPopper, Check, X, Megaphone, MapPin, Music2, type LucideIcon } from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = { general: Megaphone, location: MapPin, event: PartyPopper, routine: Music2 };

type ClassWithCount = Class & { registered_count: number };
type StudentRow = { id: string; full_name: string | null; email: string; attended: boolean; reg_id: string; guest_count: number; pass_id: string | null; payment_type: string | null };
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
  const [activeTab, setActiveTab] = useState<"classes" | "attendance" | "videos" | "passes" | "students" | "playlists" | "discounts" | "news" | "merch">("classes");
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

  // Club News
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: "", body: "", category: "general", pinned: false });
  const [newsLoading, setNewsLoading] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editNewsForm, setEditNewsForm] = useState({ title: "", body: "", category: "general", pinned: false });

  // Discount codes
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountForm, setDiscountForm] = useState({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "" });
  const [discountFormLoading, setDiscountFormLoading] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [editDiscountExpiresAt, setEditDiscountExpiresAt] = useState("");

  // Playlist form
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({ title: "", description: "", spotify_url: "" });
  const [playlistFormLoading, setPlaylistFormLoading] = useState(false);

  // Video form
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: "", description: "", youtube_url: "", class_id: "", is_public: false });
  const [videoFormLoading, setVideoFormLoading] = useState(false);

  // Merch products
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({ title: "", description: "", price_cents: "", image_url: "", sizes: "" });
  const [productFormLoading, setProductFormLoading] = useState(false);

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

  // Book for member
  const [showBookForMember, setShowBookForMember] = useState(false);
  const [bookForClass, setBookForClass] = useState<ClassWithCount | null>(null);
  const [bookForStudentId, setBookForStudentId] = useState("");
  const [bookForPassId, setBookForPassId] = useState("");
  const [bookForGuestCount, setBookForGuestCount] = useState(0);
  const [bookForLoading, setBookForLoading] = useState(false);
  const [bookForError, setBookForError] = useState("");
  const [memberPasses, setMemberPasses] = useState<any[]>([]);

  // Walk-ins
  const [walkIns, setWalkIns] = useState<{ id: string; name: string; payment_type: string }[]>([]);
  const [showAddToRoll, setShowAddToRoll] = useState(false);
  const [addToRollMode, setAddToRollMode] = useState<"member" | "walkin">("member");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPassStudentId, setWalkInPassStudentId] = useState("");
  const [walkInPassId, setWalkInPassId] = useState("");
  const [walkInPasses, setWalkInPasses] = useState<any[]>([]);
  const [walkInPaymentType, setWalkInPaymentType] = useState("casual");
  const [memberNoPassPaymentType, setMemberNoPassPaymentType] = useState("casual");
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError] = useState("");

  // Review emails
  const [sendingReviews, setSendingReviews] = useState(false);
  const [reviewsSent, setReviewsSent] = useState<number | null>(null);
  const [reviewSendErrors, setReviewSendErrors] = useState<string[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewMode, setReviewMode] = useState<"class" | "any">("class");
  const [reviewModalClassId, setReviewModalClassId] = useState("");
  const [loadingReviewCandidates, setLoadingReviewCandidates] = useState(false);
  const [reviewCandidates, setReviewCandidates] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());
  const [reviewPreviewHtml, setReviewPreviewHtml] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

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

    const { data: prods } = await supabase.from("merch_products").select("*").order("created_at", { ascending: false });
    setProducts((prods as MerchProduct[]) ?? []);

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

    const { data: np } = await supabase.from("news_posts").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setNewsPosts(np ?? []);

    setLoading(false);
  }

  async function submitNewsPost(e: React.FormEvent) {
    e.preventDefault();
    setNewsLoading(true);
    await supabase.from("news_posts").insert({ title: newsForm.title, body: newsForm.body, category: newsForm.category, pinned: newsForm.pinned });
    setNewsForm({ title: "", body: "", category: "general", pinned: false });
    setShowNewsForm(false);
    setNewsLoading(false);
    const { data: np } = await supabase.from("news_posts").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setNewsPosts(np ?? []);
  }

  async function saveEditNewsPost(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNewsId) return;
    await supabase.from("news_posts").update({ title: editNewsForm.title, body: editNewsForm.body, category: editNewsForm.category, pinned: editNewsForm.pinned }).eq("id", editingNewsId);
    setNewsPosts(prev => prev.map(p => p.id === editingNewsId ? { ...p, ...editNewsForm } : p).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
    setEditingNewsId(null);
  }

  async function deleteNewsPost(id: string) {
    await supabase.from("news_posts").delete().eq("id", id);
    setNewsPosts(prev => prev.filter(p => p.id !== id));
  }

  async function togglePin(id: string, pinned: boolean) {
    await supabase.from("news_posts").update({ pinned: !pinned }).eq("id", id);
    setNewsPosts(prev => prev.map(p => p.id === id ? { ...p, pinned: !pinned } : p).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
  }

  async function loadStudents(cls: ClassWithCount) {
    setSelectedClass(cls);
    const { data: regs } = await supabase
      .from("registrations")
      .select("id, student_id, pass_id, payment_type, guest_count, profiles(id, full_name, email)")
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
      pass_id: r.pass_id ?? null,
      payment_type: r.payment_type ?? null,
    }));
    setStudents(rows);

    // Load walk-ins for this class
    const { data: wis } = await supabase.from("walk_ins").select("id, name, payment_type").eq("class_id", cls.id);
    setWalkIns(wis ?? []);

    setActiveTab("attendance");
    setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function deleteMember(student: Profile) {
    if (!confirm(`Remove ${student.full_name ?? student.email} from the app? This permanently deletes their account, bookings, passes, and chat history. This cannot be undone.`)) return;
    const res = await fetch("/api/instructor/delete-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });
    if (res.ok) {
      setAllStudents(prev => prev.filter(s => s.id !== student.id));
    } else {
      const data = await res.json();
      alert(data.error ?? "Something went wrong");
    }
  }

  async function cancelMemberBooking(student: StudentRow) {
    if (!confirm(`Cancel ${student.full_name ?? student.email}'s booking and refund their pass credit?`)) return;
    const res = await fetch("/api/instructor/cancel-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regId: student.reg_id, passId: student.pass_id, guestCount: student.guest_count }),
    });
    if (res.ok) {
      setStudents(prev => prev.filter(s => s.reg_id !== student.reg_id));
    } else {
      const data = await res.json();
      alert(data.error ?? "Something went wrong");
    }
  }

  async function loadWalkInPasses(studentId: string) {
    setWalkInPassStudentId(studentId);
    setWalkInPassId("");
    if (!studentId) { setWalkInPasses([]); return; }
    const { data } = await supabase.from("passes").select("*, pass_types(name)")
      .eq("student_id", studentId).gt("classes_remaining", 0)
      .order("expires_at", { ascending: true, nullsFirst: false });
    const active = (data ?? []).filter((p: any) => !p.expires_at || new Date(p.expires_at) > new Date());
    setWalkInPasses(active);
    if (active.length > 0) setWalkInPassId(active[0].id);
  }

  async function submitAddToRoll(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass) return;
    setWalkInLoading(true);
    setWalkInError("");

    if (addToRollMode === "member") {
      // Book existing member + mark attended
      const res = await fetch("/api/instructor/book-for-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClass.id, studentId: bookForStudentId, passId: bookForPassId || null, guestCount: bookForGuestCount, paymentType: bookForPassId ? "pass" : memberNoPassPaymentType }),
      });
      const data = await res.json();
      if (!res.ok) { setWalkInError(data.error ?? "Something went wrong"); setWalkInLoading(false); return; }
      // Mark them attended immediately
      await supabase.from("attendance").upsert(
        { class_id: selectedClass.id, student_id: bookForStudentId, attended: true },
        { onConflict: "class_id,student_id" }
      );
      await loadStudents(selectedClass);
    } else {
      // Walk-in
      const res = await fetch("/api/instructor/add-walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClass.id, name: walkInName, passId: walkInPassId || null, paymentType: walkInPassId ? "pass" : walkInPaymentType }),
      });
      const data = await res.json();
      if (!res.ok) { setWalkInError(data.error ?? "Something went wrong"); setWalkInLoading(false); return; }
      const { data: wis } = await supabase.from("walk_ins").select("id, name, payment_type").eq("class_id", selectedClass.id);
      setWalkIns(wis ?? []);
    }

    setShowAddToRoll(false);
    setWalkInName("");
    setWalkInPassStudentId("");
    setWalkInPassId("");
    setWalkInPasses([]);
    setBookForStudentId("");
    setBookForPassId("");
    setBookForGuestCount(0);
    setWalkInLoading(false);
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

  async function deleteClass(cls: ClassWithCount) {
    const warning = cls.registered_count > 0
      ? `"${cls.title}" has ${cls.registered_count} member${cls.registered_count !== 1 ? "s" : ""} registered. Deleting it will permanently remove those registrations and any attendance records for this class. This cannot be undone. Delete anyway?`
      : `Permanently delete "${cls.title}"? This cannot be undone.`;
    if (!confirm(warning)) return;
    await supabase.from("classes").delete().eq("id", cls.id);
    loadData();
  }

  async function deleteAllUpcomingClasses() {
    if (upcomingClasses.length === 0) return;
    const totalRegistrations = upcomingClasses.reduce((sum, c) => sum + c.registered_count, 0);
    const warning = totalRegistrations > 0
      ? `Delete all ${upcomingClasses.length} upcoming classes? This includes ${totalRegistrations} member registration${totalRegistrations !== 1 ? "s" : ""} across them, which will be permanently removed along with any attendance records. This cannot be undone.`
      : `Delete all ${upcomingClasses.length} upcoming classes? This cannot be undone.`;
    if (!confirm(warning)) return;
    await supabase.from("classes").delete().in("id", upcomingClasses.map(c => c.id));
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

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setProductFormLoading(true);

    const sizes = productForm.sizes.trim()
      ? productForm.sizes.split(",").map(s => s.trim()).filter(Boolean)
      : null;

    await supabase.from("merch_products").insert({
      title: productForm.title,
      description: productForm.description || null,
      price_cents: Math.round(parseFloat(productForm.price_cents) * 100),
      image_url: productForm.image_url || null,
      sizes,
    });

    setShowProductForm(false);
    setProductForm({ title: "", description: "", price_cents: "", image_url: "", sizes: "" });
    loadData();
    setProductFormLoading(false);
  }

  async function toggleProductActive(product: MerchProduct) {
    await supabase.from("merch_products").update({ active: !product.active }).eq("id", product.id);
    loadData();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await supabase.from("merch_products").delete().eq("id", id);
    loadData();
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

  async function saveDiscountExpiry(id: string) {
    const expires_at = editDiscountExpiresAt ? new Date(editDiscountExpiresAt).toISOString() : null;
    await supabase.from("discount_codes").update({ expires_at }).eq("id", id);
    setDiscountCodes(prev => prev.map(d => d.id === id ? { ...d, expires_at } : d));
    setEditingDiscountId(null);
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

  function openReviewModal(classId?: string) {
    setReviewsSent(null);
    setReviewSendErrors([]);
    setReviewMode("class");
    setReviewCandidates([]);
    setSelectedReviewIds(new Set());
    setReviewPreviewHtml("");
    setMemberSearch("");
    setReviewModalClassId(classId ?? selectedClass?.id ?? "");
    setShowReviewModal(true);
    if (classId ?? selectedClass?.id) loadReviewCandidates(classId ?? selectedClass!.id);
  }

  function switchReviewMode(mode: "class" | "any") {
    setReviewMode(mode);
    setReviewsSent(null);
    setReviewSendErrors([]);
    setSelectedReviewIds(new Set());
    if (mode === "any") {
      setReviewModalClassId("");
      loadGenericReviewPreview();
    } else {
      setReviewPreviewHtml("");
      setReviewModalClassId(selectedClass?.id ?? "");
      if (selectedClass?.id) loadReviewCandidates(selectedClass.id);
    }
  }

  async function loadGenericReviewPreview() {
    setLoadingReviewCandidates(true);
    const res = await fetch("/api/instructor/review-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generic: true }),
    });
    const data = await res.json();
    setReviewPreviewHtml(data.previewHtml ?? "");
    setLoadingReviewCandidates(false);
  }

  async function loadReviewCandidates(classId: string) {
    setReviewModalClassId(classId);
    setLoadingReviewCandidates(true);
    const res = await fetch("/api/instructor/review-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    const data = await res.json();
    setReviewCandidates(data.candidates ?? []);
    setSelectedReviewIds(new Set((data.candidates ?? []).map((c: any) => c.id)));
    setReviewPreviewHtml(data.previewHtml ?? "");
    setLoadingReviewCandidates(false);
  }

  function toggleReviewRecipient(id: string) {
    setSelectedReviewIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function confirmSendReviews() {
    if (selectedReviewIds.size === 0) return;
    if (reviewMode === "class" && !reviewModalClassId) return;
    setSendingReviews(true);
    const res = await fetch("/api/instructor/send-review-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        reviewMode === "any"
          ? { generic: true, studentIds: Array.from(selectedReviewIds) }
          : { classId: reviewModalClassId, studentIds: Array.from(selectedReviewIds) }
      ),
    });
    const data = await res.json();
    setReviewsSent(data.sent ?? 0);
    setReviewSendErrors(data.errors ?? []);
    setSendingReviews(false);
    // Keep the modal open so the result (including any errors) is visible;
    // the instructor closes it manually once they've seen the outcome.
  }

  async function openBookForMember(cls: ClassWithCount) {
    setBookForClass(cls);
    setBookForStudentId("");
    setBookForPassId("");
    setBookForError("");
    setMemberPasses([]);
    setShowBookForMember(true);
  }

  async function loadMemberPasses(studentId: string) {
    setBookForStudentId(studentId);
    setBookForPassId("");
    if (!studentId) { setMemberPasses([]); return; }
    const { data } = await supabase
      .from("passes").select("*, pass_types(name)")
      .eq("student_id", studentId)
      .gt("classes_remaining", 0)
      .order("expires_at", { ascending: true, nullsFirst: false });
    const active = (data ?? []).filter((p: any) => !p.expires_at || new Date(p.expires_at) > new Date());
    setMemberPasses(active);
    if (active.length > 0) setBookForPassId(active[0].id);
  }

  async function bookForMember(e: React.FormEvent) {
    e.preventDefault();
    if (!bookForClass || !bookForStudentId) return;
    setBookForLoading(true);
    setBookForError("");

    const res = await fetch("/api/instructor/book-for-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: bookForClass.id, studentId: bookForStudentId, passId: bookForPassId || null, guestCount: bookForGuestCount }),
    });
    const data = await res.json();
    if (!res.ok) { setBookForError(data.error ?? "Something went wrong"); setBookForLoading(false); return; }
    setShowBookForMember(false);
    loadData();
    setBookForLoading(false);
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
    { key: "news", label: "Club News" },
    { key: "merch", label: "Merch" },
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
            <button onClick={() => openReviewModal()} className="btn-secondary py-2 px-4 text-sm">
              Send Review Emails
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

        {/* Upcoming Birthdays */}
        {(() => {
          const today = new Date();
          const upcoming = allStudents.filter(s => {
            if (!s.birth_date) return false;
            const bd = new Date(s.birth_date);
            const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
            const diff = (thisYear.getTime() - today.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 7;
          }).sort((a, b) => {
            const dayOf = (s: typeof a) => { const bd = new Date(s.birth_date!); return new Date(new Date().getFullYear(), bd.getMonth(), bd.getDate()).getTime(); };
            return dayOf(a) - dayOf(b);
          });
          if (upcoming.length === 0) return null;
          return (
            <div className="bg-[#fff0f5] border border-[#e4c3cc] rounded-2xl px-5 py-4 mb-6">
              <p className="font-heading text-sm mb-2 flex items-center gap-1.5">
                <Cake className="w-4 h-4 text-[#2041d8]" strokeWidth={1.75} /> Upcoming Birthdays
              </p>
              <div className="space-y-1">
                {upcoming.map(s => {
                  const bd = new Date(s.birth_date!);
                  const thisYear = new Date(new Date().getFullYear(), bd.getMonth(), bd.getDate());
                  const diff = Math.round((thisYear.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                  const label = diff === 0 ? "Today!" : diff === 1 ? "Tomorrow" : `in ${diff} days`;
                  return (
                    <p key={s.id} className="font-body text-sm">
                      <strong>{s.full_name ?? s.email}</strong> — {bd.toLocaleDateString("en-AU", { day: "numeric", month: "long" })} <span className="text-[#2041d8]">({label})</span>
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm uppercase tracking-widest text-[#2041d8]">Upcoming</h3>
                  <button onClick={deleteAllUpcomingClasses} className="font-body text-xs text-red-400 hover:text-red-600">
                    Remove All Upcoming
                  </button>
                </div>
                {upcomingClasses.map((cls) => (
                  <ClassRow key={cls.id} cls={cls} onAttendance={() => loadStudents(cls)} onCancel={() => cancelClass(cls)} onDelete={() => deleteClass(cls)} onBookForMember={() => openBookForMember(cls)} isToday={cls.class_date === today} />
                ))}
                {pastClasses.length > 0 && (
                  <>
                    <h3 className="font-heading text-sm uppercase tracking-widest text-gray-400 mt-8">Past</h3>
                    {pastClasses.slice(0, 5).map((cls) => (
                      <ClassRow key={cls.id} cls={cls} onAttendance={() => loadStudents(cls)} onCancel={() => cancelClass(cls)} onDelete={() => deleteClass(cls)} past />
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
                        })} · {students.filter(s => s.attended).reduce((sum, s) => sum + 1 + s.guest_count, 0) + walkIns.length}/{students.reduce((sum, s) => sum + 1 + s.guest_count, 0) + walkIns.length} attended
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {reviewsSent !== null && (
                      <p className="font-body text-sm text-green-600">
                        {reviewsSent === 0 ? "No first-timers today" : `${reviewsSent} review email${reviewsSent !== 1 ? "s" : ""} sent!`}
                      </p>
                    )}
                    {reviewSendErrors.length > 0 && (
                      <p className="font-body text-sm text-red-500">
                        {reviewSendErrors.length} failed: {reviewSendErrors.join("; ")}
                      </p>
                    )}
                    <button
                      onClick={() => { setShowAddToRoll(true); setAddToRollMode("member"); setWalkInError(""); setBookForStudentId(""); setBookForPassId(""); setBookForGuestCount(0); setWalkInName(""); setWalkInPassStudentId(""); setWalkInPassId(""); setWalkInPasses([]); setWalkInPaymentType("casual"); setMemberNoPassPaymentType("casual"); }}
                      className="btn-primary py-1.5 px-3 text-xs"
                    >
                      + Add to Roll
                    </button>
                    <button
                      onClick={() => openReviewModal(selectedClass.id)}
                      disabled={loadingReviewCandidates}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      {loadingReviewCandidates ? "Loading…" : "Send Review Emails"}
                    </button>
                  </div>
                </div>

                {students.length === 0 && walkIns.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="font-body text-gray-400">No registered members for this class.</p>
                  </div>
                ) : (
                  <div className="card overflow-hidden">
                    <div className="divide-y divide-gray-50">
                      {students.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-5 py-3 group">
                          <div className="min-w-0">
                            <p className="font-medium text-sm font-body">
                              {s.full_name ?? "—"}
                              {s.guest_count > 0 && (
                                <span className="ml-2 badge bg-[#e4c3cc]/50 text-black">+{s.guest_count} guest</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 font-body">{s.email}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              onClick={() => cancelMemberBooking(s)}
                              className="font-body text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Cancel booking & refund pass"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => toggleAttendance(s.id, s.attended)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                s.attended
                                  ? "bg-[#2041d8] border-[#2041d8] text-white"
                                  : "border-gray-300 hover:border-[#2041d8]"
                              }`}
                            >
                              {s.attended ? <Check className="w-4 h-4 mx-auto" strokeWidth={2.5} /> : ""}
                            </button>
                          </div>
                        </div>
                      ))}
                      {walkIns.map((w) => (
                        <div key={w.id} className="flex items-center justify-between px-5 py-3 bg-[#fff8f3]">
                          <div>
                            <p className="font-medium text-sm font-body">
                              {w.name}
                              <span className="ml-2 badge bg-[#e4c3cc]/50 text-black text-xs">Walk-in</span>
                              {w.payment_type === "pass" && <span className="ml-1 badge bg-blue-100 text-blue-700 text-xs">Pass deducted</span>}
                            </p>
                            <p className="text-xs text-gray-400 font-body">{w.payment_type === "complimentary" ? "Complimentary" : "Pass"}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#2041d8] border-2 border-[#2041d8] text-white flex items-center justify-center shrink-0"><Check className="w-4 h-4" strokeWidth={2.5} /></div>
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

        {/* MERCH TAB */}
        {activeTab === "merch" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-body text-sm text-gray-500">{products.length} product{products.length !== 1 ? "s" : ""}</p>
              <button onClick={() => setShowProductForm(true)} className="btn-primary py-2 px-4 text-sm">+ Add Product</button>
            </div>
            {products.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400 mb-4">No products yet. Add your first one!</p>
                <button onClick={() => setShowProductForm(true)} className="btn-primary">Add Product</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div key={p.id} className={`card overflow-hidden flex flex-col ${!p.active ? "opacity-50" : ""}`}>
                    {p.image_url && (
                      <div className="aspect-square bg-[#fff8f3]">
                        <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={p.active ? "badge-confirmed" : "badge bg-gray-100 text-gray-500"}>
                          {p.active ? "Active" : "Hidden"}
                        </span>
                      </div>
                      <h3 className="font-heading text-base">{p.title}</h3>
                      <p className="font-heading text-lg text-[#2041d8] mt-1">{formatPrice(p.price_cents)}</p>
                      {p.sizes && p.sizes.length > 0 && (
                        <p className="font-body text-xs text-gray-400 mt-1">Sizes: {p.sizes.join(", ")}</p>
                      )}
                      <div className="flex gap-3 mt-auto pt-4">
                        <button onClick={() => toggleProductActive(p)} className="font-body text-xs text-[#2041d8] hover:underline">
                          {p.active ? "Hide" : "Unhide"}
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="font-body text-xs text-red-400 hover:text-red-600 underline">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
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
                      <p className="text-xs text-gray-400 font-body inline-flex items-center gap-1">
                        {s.phone ?? "—"} · {new Date(s.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        {s.birth_date && (
                          <> · <Cake className="w-3 h-3 text-[#2041d8]" strokeWidth={1.75} /> {new Date(s.birth_date).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}</>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={() => openAssignPass(s)}
                        className="font-body text-xs text-[#2041d8] hover:underline"
                      >
                        Assign pass
                      </button>
                      <button
                        onClick={() => deleteMember(s)}
                        className="font-body text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
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
                          {editingDiscountId === d.id ? (
                            <input
                              type="date"
                              className="input py-1 px-2 text-xs w-36"
                              value={editDiscountExpiresAt}
                              onChange={e => setEditDiscountExpiresAt(e.target.value)}
                            />
                          ) : (
                            d.expires_at ? new Date(d.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "Never"
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={d.active ? "badge-confirmed" : "badge bg-gray-100 text-gray-500"}>
                            {d.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right flex items-center gap-3 justify-end">
                          {editingDiscountId === d.id ? (
                            <>
                              <button onClick={() => saveDiscountExpiry(d.id)} className="font-body text-xs text-green-600 hover:underline">Save</button>
                              <button onClick={() => setEditingDiscountId(null)} className="font-body text-xs text-gray-400 hover:underline">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => { setEditingDiscountId(d.id); setEditDiscountExpiresAt(d.expires_at ? d.expires_at.split("T")[0] : ""); }} className="font-body text-xs text-gray-500 hover:underline">Edit</button>
                          )}
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

        {/* CLUB NEWS TAB */}
        {activeTab === "news" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-body text-sm text-gray-500">{newsPosts.length} post{newsPosts.length !== 1 ? "s" : ""}</p>
              <button onClick={() => setShowNewsForm(true)} className="btn-primary py-2 px-4 text-sm">+ New Post</button>
            </div>

            {showNewsForm && (
              <div className="card p-6 mb-6">
                <h3 className="font-heading text-base mb-4">New Post</h3>
                <form onSubmit={submitNewsPost} className="space-y-4">
                  <div>
                    <label className="label">Title</label>
                    <input className="input" placeholder="e.g. New location for June 12" value={newsForm.title} onChange={e => setNewsForm(f => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="label">Message</label>
                    <textarea className="input min-h-[100px]" placeholder="Write your announcement here…" value={newsForm.body} onChange={e => setNewsForm(f => ({ ...f, body: e.target.value }))} required />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="label">Category</label>
                      <select className="input" value={newsForm.category} onChange={e => setNewsForm(f => ({ ...f, category: e.target.value }))}>
                        <option value="general">General</option>
                        <option value="location">Location Change</option>
                        <option value="event">Event</option>
                        <option value="routine">New Routine</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-1 gap-2">
                      <input type="checkbox" id="pinned" checked={newsForm.pinned} onChange={e => setNewsForm(f => ({ ...f, pinned: e.target.checked }))} className="w-4 h-4" />
                      <label htmlFor="pinned" className="font-body text-sm">Pin to top</label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowNewsForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                    <button type="submit" className="btn-primary flex-1 justify-center" disabled={newsLoading}>{newsLoading ? "Posting…" : "Publish"}</button>
                  </div>
                </form>
              </div>
            )}

            {newsPosts.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400 mb-4">No posts yet.</p>
                <button onClick={() => setShowNewsForm(true)} className="btn-primary">Create First Post</button>
              </div>
            ) : (
              <div className="space-y-4">
                {newsPosts.map(post => {
                  const CatIcon = CATEGORY_ICONS[post.category as string] ?? Megaphone;
                  const isEditing = editingNewsId === post.id;
                  return (
                    <div key={post.id} className={`card p-5 ${post.pinned ? "border-2 border-[#2041d8]" : ""}`}>
                      {isEditing ? (
                        <form onSubmit={saveEditNewsPost} className="space-y-3">
                          <input className="input" value={editNewsForm.title} onChange={e => setEditNewsForm(f => ({ ...f, title: e.target.value }))} required />
                          <textarea className="input min-h-[100px]" value={editNewsForm.body} onChange={e => setEditNewsForm(f => ({ ...f, body: e.target.value }))} required />
                          <div className="flex gap-4">
                            <select className="input flex-1" value={editNewsForm.category} onChange={e => setEditNewsForm(f => ({ ...f, category: e.target.value }))}>
                              <option value="general">General</option>
                              <option value="location">Location Change</option>
                              <option value="event">Event</option>
                              <option value="routine">New Routine</option>
                            </select>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={editNewsForm.pinned} onChange={e => setEditNewsForm(f => ({ ...f, pinned: e.target.checked }))} className="w-4 h-4" />
                              <label className="font-body text-sm">Pinned</label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingNewsId(null)} className="btn-secondary flex-1 justify-center py-1.5 text-sm">Cancel</button>
                            <button type="submit" className="btn-primary flex-1 justify-center py-1.5 text-sm">Save</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-heading text-base flex items-center gap-1.5">
                              <CatIcon className="w-4 h-4 shrink-0 text-[#2041d8]" strokeWidth={1.75} />
                              {post.title} {post.pinned && <span className="ml-1 badge bg-[#2041d8] text-white text-xs">Pinned</span>}
                            </p>
                            <p className="font-body text-sm text-gray-600 mt-1 whitespace-pre-wrap"><Linkify text={post.body} /></p>
                            <p className="font-body text-xs text-gray-400 mt-2">{new Date(post.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setEditingNewsId(post.id); setEditNewsForm({ title: post.title, body: post.body, category: post.category, pinned: post.pinned }); }} className="font-body text-xs text-gray-500 hover:underline">Edit</button>
                            <button onClick={() => togglePin(post.id, post.pinned)} className="font-body text-xs text-[#2041d8] hover:underline">{post.pinned ? "Unpin" : "Pin"}</button>
                            <button onClick={() => deleteNewsPost(post.id)} className="font-body text-xs text-red-500 hover:underline">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

        {showProductForm && (
          <Modal title="Add Product" onClose={() => setShowProductForm(false)}>
            <form onSubmit={addProduct} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  placeholder="e.g. Club Hoodie"
                  value={productForm.title}
                  onChange={e => setProductForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Fabric, fit, anything members should know"
                  value={productForm.description}
                  onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Price (AUD)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price_cents}
                  onChange={e => setProductForm(f => ({ ...f, price_cents: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Image URL (optional)</label>
                <input
                  className="input"
                  placeholder="https://..."
                  value={productForm.image_url}
                  onChange={e => setProductForm(f => ({ ...f, image_url: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Sizes (optional, comma-separated)</label>
                <input
                  className="input"
                  placeholder="e.g. S, M, L, XL"
                  value={productForm.sizes}
                  onChange={e => setProductForm(f => ({ ...f, sizes: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProductForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={productFormLoading}>
                  {productFormLoading ? "Adding…" : "Add Product"}
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
                        <span className={`inline-flex items-center gap-1 ${
                          r.status === "invited" ? "text-green-600 font-medium" :
                          r.status === "skipped" ? "text-gray-400" : "text-red-500"
                        }`}>
                          {r.status === "invited" ? <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Invited</> : r.status === "skipped" ? "Already exists" : <><X className="w-3.5 h-3.5" strokeWidth={2.5} /> {r.reason}</>}
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

        {/* BOOK FOR MEMBER MODAL */}
        {showBookForMember && bookForClass && (
          <Modal title={`Book a Member — ${new Date(bookForClass.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long" })}`} onClose={() => setShowBookForMember(false)}>
            <form onSubmit={bookForMember} className="space-y-4">
              <div>
                <label className="label">Select Member</label>
                <select
                  className="input"
                  value={bookForStudentId}
                  onChange={e => loadMemberPasses(e.target.value)}
                  required
                >
                  <option value="">— Choose a member —</option>
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>
                  ))}
                </select>
              </div>

              {bookForStudentId && (
                <div>
                  <label className="label">Pass to use</label>
                  {memberPasses.length === 0 ? (
                    <p className="font-body text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                      No active pass — will be booked as <strong>complimentary</strong>.
                    </p>
                  ) : (
                    <select
                      className="input"
                      value={bookForPassId}
                      onChange={e => setBookForPassId(e.target.value)}
                    >
                      {memberPasses.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.pass_types?.name} — {p.classes_remaining} class{p.classes_remaining !== 1 ? "es" : ""} left
                        </option>
                      ))}
                      <option value="">Book as complimentary (no pass)</option>
                    </select>
                  )}
                </div>
              )}

              {bookForStudentId && (
                <div>
                  <label className="label">Extra guests (e.g. family member sharing pass)</label>
                  <select
                    className="input"
                    value={bookForGuestCount}
                    onChange={e => setBookForGuestCount(Number(e.target.value))}
                  >
                    <option value={0}>No guests</option>
                    <option value={1}>+ 1 guest (2 credits total)</option>
                    <option value={2}>+ 2 guests (3 credits total)</option>
                    <option value={3}>+ 3 guests (4 credits total)</option>
                  </select>
                </div>
              )}

              {bookForError && (
                <p className="font-body text-sm text-red-500">{bookForError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBookForMember(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={bookForLoading || !bookForStudentId}>
                  {bookForLoading ? "Booking…" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ADD TO ROLL MODAL */}
        {showAddToRoll && selectedClass && (
          <Modal title={`Add to Roll — ${new Date(selectedClass.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long" })}`} onClose={() => setShowAddToRoll(false)}>
            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
              <button type="button" onClick={() => setAddToRollMode("member")} className={`flex-1 py-2 font-body text-sm transition-colors ${addToRollMode === "member" ? "bg-[#2041d8] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                Existing Member
              </button>
              <button type="button" onClick={() => setAddToRollMode("walkin")} className={`flex-1 py-2 font-body text-sm transition-colors ${addToRollMode === "walkin" ? "bg-[#2041d8] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                Walk-in (no account)
              </button>
            </div>

            <form onSubmit={submitAddToRoll} className="space-y-4">
              {addToRollMode === "member" ? (
                <>
                  <div>
                    <label className="label">Select Member</label>
                    <select className="input" value={bookForStudentId} onChange={e => loadMemberPasses(e.target.value)} required>
                      <option value="">— Choose a member —</option>
                      {allStudents.map(s => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
                    </select>
                  </div>
                  {bookForStudentId && (
                    <div>
                      <label className="label">Pass to use</label>
                      {memberPasses.length === 0 ? (
                        <p className="font-body text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">No active pass — will be booked as <strong>complimentary</strong>.</p>
                      ) : (
                        <select className="input" value={bookForPassId} onChange={e => setBookForPassId(e.target.value)}>
                          {memberPasses.map((p: any) => <option key={p.id} value={p.id}>{p.pass_types?.name} — {p.classes_remaining} left</option>)}
                          <option value="">Paid on spot / Complimentary</option>
                        </select>
                      )}
                      {bookForStudentId && !bookForPassId && memberPasses.length > 0 && (
                        <div className="mt-2">
                          <label className="label">Payment type</label>
                          <select className="input" value={memberNoPassPaymentType} onChange={e => setMemberNoPassPaymentType(e.target.value)}>
                            <option value="casual">Casual (paid on spot)</option>
                            <option value="complimentary">Complimentary</option>
                          </select>
                        </div>
                      )}
                      {bookForStudentId && memberPasses.length === 0 && (
                        <div className="mt-2">
                          <label className="label">Payment type</label>
                          <select className="input" value={memberNoPassPaymentType} onChange={e => setMemberNoPassPaymentType(e.target.value)}>
                            <option value="casual">Casual (paid on spot)</option>
                            <option value="complimentary">Complimentary</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  {bookForStudentId && (
                    <div>
                      <label className="label">Extra guests</label>
                      <select className="input" value={bookForGuestCount} onChange={e => setBookForGuestCount(Number(e.target.value))}>
                        <option value={0}>No guests</option>
                        <option value={1}>+ 1 guest (2 credits total)</option>
                        <option value={2}>+ 2 guests (3 credits total)</option>
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="label">Name</label>
                    <input className="input" placeholder="e.g. Christine" value={walkInName} onChange={e => setWalkInName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Payment type</label>
                    <select className="input" value={walkInPaymentType} onChange={e => setWalkInPaymentType(e.target.value)}>
                      <option value="casual">Casual (paid on spot)</option>
                      <option value="complimentary">Complimentary</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Deduct from a member's pass? (optional)</label>
                    <select className="input" value={walkInPassStudentId} onChange={e => loadWalkInPasses(e.target.value)}>
                      <option value="">— No pass to deduct —</option>
                      {allStudents.map(s => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
                    </select>
                  </div>
                  {walkInPasses.length > 0 && (
                    <div>
                      <label className="label">Pass to deduct from</label>
                      <select className="input" value={walkInPassId} onChange={e => setWalkInPassId(e.target.value)}>
                        {walkInPasses.map((p: any) => <option key={p.id} value={p.id}>{p.pass_types?.name} — {p.classes_remaining} left</option>)}
                        <option value="">Don't deduct</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {walkInError && <p className="font-body text-sm text-red-500">{walkInError}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddToRoll(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={walkInLoading || (addToRollMode === "member" && !bookForStudentId) || (addToRollMode === "walkin" && !walkInName)}>
                  {walkInLoading ? "Adding…" : "Add to Roll"}
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

        {showReviewModal && (
          <Modal title="Send Review Emails" onClose={() => setShowReviewModal(false)}>
            <div className="space-y-4">
              <div className="flex gap-2 border border-gray-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => switchReviewMode("class")}
                  className={`flex-1 py-1.5 rounded-lg font-body text-xs font-medium transition-colors ${reviewMode === "class" ? "bg-[#2041d8] text-white" : "text-gray-500"}`}
                >
                  First-timers by class
                </button>
                <button
                  type="button"
                  onClick={() => switchReviewMode("any")}
                  className={`flex-1 py-1.5 rounded-lg font-body text-xs font-medium transition-colors ${reviewMode === "any" ? "bg-[#2041d8] text-white" : "text-gray-500"}`}
                >
                  Any members
                </button>
              </div>

              {reviewMode === "class" ? (
                !reviewModalClassId ? (
                  <div>
                    <label className="label">Choose a class</label>
                    <select
                      className="input"
                      defaultValue=""
                      onChange={e => e.target.value && loadReviewCandidates(e.target.value)}
                    >
                      <option value="" disabled>Select a class…</option>
                      {todaysClass && (
                        <option value={todaysClass.id}>
                          Today — {todaysClass.title}
                        </option>
                      )}
                      {pastClasses.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })} — {cls.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : loadingReviewCandidates ? (
                  <p className="font-body text-sm text-gray-500">Loading…</p>
                ) : reviewCandidates.length === 0 ? (
                  <p className="font-body text-sm text-gray-500">No first-time attendees eligible for a review email from this class.</p>
                ) : (
                  <>
                    <p className="font-body text-sm text-gray-500">
                      Select who should receive the review email:
                    </p>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-3">
                      {reviewCandidates.map(c => (
                        <label key={c.id} className="flex items-center gap-2 font-body text-sm">
                          <input
                            type="checkbox"
                            checked={selectedReviewIds.has(c.id)}
                            onChange={() => toggleReviewRecipient(c.id)}
                          />
                          <span>{c.full_name ?? c.email}</span>
                          <span className="text-xs text-gray-400">{c.email}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <>
                  <p className="font-body text-sm text-gray-500">
                    Select any members to send the review email to:
                  </p>
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
                          <input
                            type="checkbox"
                            checked={selectedReviewIds.has(s.id)}
                            onChange={() => toggleReviewRecipient(s.id)}
                          />
                          <span>{s.full_name ?? s.email}</span>
                          <span className="text-xs text-gray-400">{s.email}</span>
                        </label>
                      ))}
                  </div>
                </>
              )}

              {reviewPreviewHtml && ((reviewMode === "class" && reviewModalClassId && reviewCandidates.length > 0) || reviewMode === "any") && (
                <>
                  <div>
                    <p className="font-body text-xs uppercase tracking-wide text-gray-400 mb-2">Preview</p>
                    <div
                      className="border border-gray-100 rounded-xl overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: reviewPreviewHtml }}
                    />
                  </div>

                  {reviewsSent !== null && (
                    <div className="space-y-1">
                      <p className="font-body text-sm text-green-600">
                        {reviewsSent === 0 ? "No emails sent." : `${reviewsSent} review email${reviewsSent !== 1 ? "s" : ""} sent successfully.`}
                      </p>
                      {reviewSendErrors.length > 0 && (
                        <p className="font-body text-sm text-red-500">
                          {reviewSendErrors.length} failed: {reviewSendErrors.join("; ")}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowReviewModal(false)} className="btn-secondary flex-1 justify-center">
                      {reviewsSent !== null ? "Close" : "Cancel"}
                    </button>
                    {reviewsSent === null && (
                      <button
                        type="button"
                        onClick={confirmSendReviews}
                        disabled={sendingReviews || selectedReviewIds.size === 0}
                        className="btn-primary flex-1 justify-center"
                      >
                        {sendingReviews ? "Sending…" : `Send to ${selectedReviewIds.size}`}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </Modal>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ClassRow({ cls, onAttendance, onCancel, onDelete, onBookForMember, past, isToday }: {
  cls: ClassWithCount;
  onAttendance: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onBookForMember?: () => void;
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
      <div className="flex items-center gap-4 flex-wrap shrink-0">
        <div className="text-center">
          <p className="font-heading text-base">{cls.registered_count}/{cls.capacity}</p>
          <p className="font-body text-xs text-gray-400">booked</p>
        </div>
        <div className="text-center">
          <p className="font-heading text-base">{formatPrice(cls.price_cents)}</p>
          <p className="font-body text-xs text-gray-400">per person</p>
        </div>
        <div className="flex gap-2">
          {onBookForMember && (
            <button onClick={onBookForMember} className="btn-secondary py-1.5 px-3 text-xs">
              + Book Member
            </button>
          )}
          <button onClick={onAttendance} className={`py-1.5 px-3 text-xs ${isToday ? "btn-primary" : "btn-secondary"}`}>
            {isToday ? "Take Roll" : "Attendance"}
          </button>
          {!cls.is_cancelled && !past && (
            <button onClick={onCancel} className="font-body text-xs text-red-400 hover:text-red-600 underline">
              Cancel
            </button>
          )}
          <button onClick={onDelete} className="font-body text-xs text-red-400 hover:text-red-600 underline">
            Delete
          </button>
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
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
