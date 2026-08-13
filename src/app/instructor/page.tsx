"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { formatPrice, formatTime, getYouTubeId } from "@/lib/stripe";
import { todayLocal, toLocalDateStr } from "@/lib/date";
import type { Class, MerchProduct, Pass, PassType, Playlist, Profile, Review, Video } from "@/lib/supabase";
import Link from "next/link";
import Linkify from "@/components/Linkify";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Cake, PartyPopper, Check, X, Megaphone, MapPin, Music2, Image as ImageIcon, Film, Upload, type LucideIcon } from "lucide-react";
import { MERCH_ENABLED } from "@/lib/feature-flags";

const CATEGORY_ICONS: Record<string, LucideIcon> = { general: Megaphone, location: MapPin, event: PartyPopper, routine: Music2 };

// Fallback title for a bulk-uploaded video when the instructor leaves the title
// field blank — e.g. "sneakers_class_1.mov" -> "sneakers class 1".
function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^./]+$/, "");
  return base.replace(/[_-]+/g, " ").trim() || "Untitled recording";
}

// Quick-fill addresses for the Location field — instructors can still type over
// these freely if a location ever changes, this is just a shortcut.
const LOCATION_ALEXANDRIA = "BYLA Alexandria — 70 O'Riordan St, Alexandria NSW 2015 (Village Nation, Studio 1)";
const LOCATION_MANLY = "BYLA Manly — St. Matthews Church Hall, 1 Darley Road, Manly NSW 2095";

const DESCRIPTION_ALEXANDRIA = `Hola! Join us in Alexandria on Tuesdays. Our Reggaeton classes hit the perfect in-between for beginner and intermediate level!

Directions:
Enter through glass gate, look for Studio 1 on the 2nd floor.
Street parking available.

Cancellation Policy
All class packages purchased are non-refundable. Packages are valid for the specified duration and cannot be extended unless approved by BYLA Dance in exceptional circumstances. If you are unable to attend a class, you may cancel your booking at least 24 hours before the scheduled start time. Late cancellations or no-shows will result in the loss of the session without a refund or reschedule. If you cannot attend a class, you may transfer your booking to someone else.
Please notify BYLA Dance with the name of the person attending in your place.`;

const DESCRIPTION_MANLY = `Hola! Join us in Manly on Thursdays. Our Reggaeton classes hit the perfect in-between for beginner and intermediate level!

Directions:
Enter through white wooden gate. There is a Door Code which is updated and pinned each month on Byla News. Allocate time to find street parking.

Cancellation Policy
All class packages purchased are non-refundable. Packages are valid for the specified duration and cannot be extended unless approved by BYLA Dance in exceptional circumstances. If you are unable to attend a class, you may cancel your booking at least 24 hours before the scheduled start time. Late cancellations or no-shows will result in the loss of the session without a refund or reschedule. If you cannot attend a class, you may transfer your booking to someone else.
Please notify BYLA Dance with the name of the person attending in your place.`;

const DAY_NAMES_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const PASS_TYPE_LABELS = { casual: "Casual Class only", five: "5-Class Pack only", ten: "10-Class Pack only" };

type ClassWithCount = Class & { registered_count: number };
type StudentRow = { id: string; full_name: string | null; email: string; avatar_url: string | null; attended: boolean; reg_id: string; guest_count: number; pass_id: string | null; payment_type: string | null };
type PassRow = Pass & { profiles: { full_name: string | null; email: string } };

export default function InstructorPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; confirmLabel?: string; action: () => void } | null>(null);
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [assignInstructorTarget, setAssignInstructorTarget] = useState<ClassWithCount | null>(null);
  const [assignInstructor1, setAssignInstructor1] = useState("");
  const [assignInstructor2, setAssignInstructor2] = useState("");
  const [assignInstructorLoading, setAssignInstructorLoading] = useState(false);
  const [assignInstructorError, setAssignInstructorError] = useState("");
  const [editBioTarget, setEditBioTarget] = useState<Profile | null>(null);
  const [editBioForm, setEditBioForm] = useState({ title: "", bio: "" });
  const [editBioLoading, setEditBioLoading] = useState(false);
  const [editBioError, setEditBioError] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [allPasses, setAllPasses] = useState<PassRow[]>([]);
  const [allStudents, setAllStudents] = useState<Profile[]>([]);
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTab, setActiveTab] = useState<"classes" | "attendance" | "videos" | "passes" | "students" | "playlists" | "discounts" | "news" | "merch" | "reviews" | "instructors">("classes");
  const [selectedClass, setSelectedClass] = useState<ClassWithCount | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Create/edit class form
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({ title: "", description: "", class_date: "", class_time: "19:30", price_cents: "26", capacity: "30", durationMinutes: "60", altDurationMinutes: "", altPriceCents: "", location: "", isSpecial: false, specialLabel: "" });
  const [classFormLoading, setClassFormLoading] = useState(false);
  const [classFormError, setClassFormError] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Bulk create recurring classes
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState({ title: "", description: "", price_cents: "26", capacity: "30", durationMinutes: "60", classTime: "19:30", dayOfWeek: "2", end_date: "", altDurationMinutes: "", altPriceCents: "", location: "" });
  const [bulkFormError, setBulkFormError] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Bulk import
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{ full_name: string; email: string; phone: string }[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ email: string; name: string; status: string; reason?: string }[] | null>(null);
  const [bulkParseError, setBulkParseError] = useState("");

  // BYLA News
  const [newsPosts, setNewsPosts] = useState<any[]>([]);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: "", body: "", category: "general", pinned: false });
  const [newsImage, setNewsImage] = useState<string | null>(null);
  const [newsImageError, setNewsImageError] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editNewsForm, setEditNewsForm] = useState({ title: "", body: "", category: "general", pinned: false, image_url: null as string | null });
  const [editNewsImage, setEditNewsImage] = useState<string | null>(null);
  const [editNewsImageError, setEditNewsImageError] = useState("");
  const newsImageInputRef = useRef<HTMLInputElement>(null);
  const editNewsImageInputRef = useRef<HTMLInputElement>(null);

  // Discount codes
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountForm, setDiscountForm] = useState({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "", applicable_pass_type: "" });
  const [discountFormLoading, setDiscountFormLoading] = useState(false);

  // Google reviews carousel (homepage)
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ author_name: "", rating: "5", review_text: "" });
  const [reviewFormLoading, setReviewFormLoading] = useState(false);
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
  const [videoMode, setVideoMode] = useState<"upload" | "youtube">("upload");
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadIndex, setVideoUploadIndex] = useState(0);

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
  const [addStudentWarning, setAddStudentWarning] = useState<{ message: string; url: string } | null>(null);

  // Assign pass form
  const [showAssignPassForm, setShowAssignPassForm] = useState(false);
  const [assignPassTarget, setAssignPassTarget] = useState<Profile | null>(null);
  const [assignPassTypeId, setAssignPassTypeId] = useState("");
  const [assignPassSource, setAssignPassSource] = useState("cash");
  const [assignPassAmount, setAssignPassAmount] = useState("");
  const [assignPassClassesRemaining, setAssignPassClassesRemaining] = useState("");
  const [assignPassLoading, setAssignPassLoading] = useState(false);
  const [assignPassError, setAssignPassError] = useState("");

  // Debit pass
  const [debitingPassId, setDebitingPassId] = useState<string | null>(null);
  const [deletingPassId, setDeletingPassId] = useState<string | null>(null);

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
    const todayStr = todayLocal();
    setSelectedClass(prev => {
      if (!prev) return null;
      if (prev.class_date < todayStr) return null;
      return enriched.find(c => c.id === prev.id) ?? null;
    });

    const { data: instructorProfiles } = await supabase.from("profiles").select("*").eq("role", "instructor").order("full_name");
    setInstructors(instructorProfiles ?? []);

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

    const { data: revs } = await supabase.from("reviews").select("*").order("created_at", { ascending: true });
    setReviews((revs as Review[]) ?? []);

    const { data: np } = await supabase.from("news_posts").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setNewsPosts(np ?? []);

    setLoading(false);
  }

  function readImageAsBase64(file: File, onError: (msg: string) => void, onLoad: (base64: string) => void) {
    if (file.size > 5 * 1024 * 1024) { onError("Image must be under 5MB."); return; }
    onError("");
    const reader = new FileReader();
    reader.onload = () => onLoad(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadNewsImage(base64: string): Promise<string | null> {
    const res = await fetch("/api/instructor/upload-news-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64 }),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error);
    return result.url;
  }

  async function submitNewsPost(e: React.FormEvent) {
    e.preventDefault();
    setNewsLoading(true);
    setNewsImageError("");

    let imageUrl: string | null = null;
    if (newsImage) {
      try {
        imageUrl = await uploadNewsImage(newsImage);
      } catch (err: any) {
        setNewsImageError(err.message ?? "Image upload failed");
        setNewsLoading(false);
        return;
      }
    }

    await supabase.from("news_posts").insert({ title: newsForm.title, body: newsForm.body, category: newsForm.category, pinned: newsForm.pinned, image_url: imageUrl });
    setNewsForm({ title: "", body: "", category: "general", pinned: false });
    setNewsImage(null);
    setShowNewsForm(false);
    setNewsLoading(false);
    const { data: np } = await supabase.from("news_posts").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setNewsPosts(np ?? []);
  }

  async function saveEditNewsPost(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNewsId) return;
    setEditNewsImageError("");

    let imageUrl = editNewsForm.image_url;
    if (editNewsImage) {
      try {
        imageUrl = await uploadNewsImage(editNewsImage);
      } catch (err: any) {
        setEditNewsImageError(err.message ?? "Image upload failed");
        return;
      }
    }

    await supabase.from("news_posts").update({ title: editNewsForm.title, body: editNewsForm.body, category: editNewsForm.category, pinned: editNewsForm.pinned, image_url: imageUrl }).eq("id", editingNewsId);
    setNewsPosts(prev => prev.map(p => p.id === editingNewsId ? { ...p, ...editNewsForm, image_url: imageUrl } : p).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
    setEditingNewsId(null);
    setEditNewsImage(null);
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
      .select("id, student_id, pass_id, payment_type, guest_count, profiles(id, full_name, email, avatar_url)")
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
      avatar_url: r.profiles.avatar_url,
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

  function deleteMember(student: Profile) {
    setConfirmDialog({
      message: `Remove ${student.full_name ?? student.email} from the app? This permanently deletes their account, bookings, passes, and chat history. This cannot be undone.`,
      action: async () => {
        const res = await fetch("/api/instructor/delete-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: student.id }),
        });
        if (res.ok) {
          setAllStudents(prev => prev.filter(s => s.id !== student.id));
        } else {
          const data = await res.json();
          setActionError(data.error ?? "Something went wrong");
        }
      },
    });
  }

  function cancelMemberBooking(student: StudentRow) {
    setConfirmDialog({
      message: `Cancel ${student.full_name ?? student.email}'s booking and refund their pass credit?`,
      action: async () => {
        const res = await fetch("/api/instructor/cancel-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regId: student.reg_id, passId: student.pass_id, guestCount: student.guest_count }),
        });
        if (res.ok) {
          setStudents(prev => prev.filter(s => s.reg_id !== student.reg_id));
        } else {
          const data = await res.json();
          setActionError(data.error ?? "Something went wrong");
        }
      },
    });
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

  function openNewClass() {
    setEditingClassId(null);
    setClassForm({ title: "", description: "", class_date: "", class_time: "19:30", price_cents: "26", capacity: "30", durationMinutes: "60", altDurationMinutes: "", altPriceCents: "", location: "", isSpecial: false, specialLabel: "" });
    setClassFormError("");
    setShowClassForm(true);
  }

  function openEditClass(cls: ClassWithCount) {
    setEditingClassId(cls.id);
    setClassForm({
      title: cls.title,
      description: cls.description ?? "",
      class_date: cls.class_date,
      class_time: cls.class_time,
      price_cents: (cls.price_cents / 100).toString(),
      capacity: cls.capacity.toString(),
      durationMinutes: cls.duration_minutes.toString(),
      altDurationMinutes: cls.alt_duration_minutes ? cls.alt_duration_minutes.toString() : "",
      altPriceCents: cls.alt_price_cents ? (cls.alt_price_cents / 100).toString() : "",
      location: cls.location,
      isSpecial: cls.is_special ?? false,
      specialLabel: cls.special_label ?? "",
    });
    setClassFormError("");
    setShowClassForm(true);
  }

  async function saveClass(e: React.FormEvent) {
    e.preventDefault();
    setClassFormLoading(true);
    setClassFormError("");

    const payload = {
      title: classForm.title,
      description: classForm.description || null,
      class_date: classForm.class_date,
      class_time: classForm.class_time,
      price_cents: Math.round(parseFloat(classForm.price_cents) * 100),
      capacity: parseInt(classForm.capacity),
      duration_minutes: parseInt(classForm.durationMinutes),
      alt_duration_minutes: classForm.altDurationMinutes ? parseInt(classForm.altDurationMinutes) : null,
      alt_price_cents: classForm.altPriceCents ? Math.round(parseFloat(classForm.altPriceCents) * 100) : null,
      ...(classForm.location ? { location: classForm.location } : {}),
      is_special: classForm.isSpecial,
      special_label: classForm.isSpecial ? (classForm.specialLabel || "Special Class") : null,
    };

    const { error } = editingClassId
      ? await supabase.from("classes").update(payload).eq("id", editingClassId)
      : await supabase.from("classes").insert({ ...payload, instructor_id: profile!.id });

    if (!error) {
      setShowClassForm(false);
      setEditingClassId(null);
      setClassForm({ title: "", description: "", class_date: "", class_time: "19:30", price_cents: "26", capacity: "30", durationMinutes: "60", altDurationMinutes: "", altPriceCents: "", location: "", isSpecial: false, specialLabel: "" });
      loadData();
    } else {
      setClassFormError(error.message);
    }
    setClassFormLoading(false);
  }

  async function bulkCreateClasses(e: React.FormEvent) {
    e.preventDefault();
    setBulkFormError("");

    if (!bulkForm.title.trim()) {
      setBulkFormError("Class Title is required.");
      return;
    }
    if (!bulkForm.end_date) {
      setBulkFormError('"Create classes until" needs a date.');
      return;
    }
    if (!bulkForm.price_cents || !bulkForm.capacity) {
      setBulkFormError("Price and Capacity are required.");
      return;
    }

    setBulkLoading(true);

    const endDate = new Date(bulkForm.end_date + "T23:59:59");
    const targetDay = parseInt(bulkForm.dayOfWeek);
    const matchingDates: string[] = [];
    const d = new Date();
    while (d <= endDate) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === targetDay) matchingDates.push(toLocalDateStr(d));
    }

    const existingDates = new Set(classes.map(c => c.class_date));
    const newDates = matchingDates.filter(f => !existingDates.has(f));

    if (newDates.length === 0) {
      setBulkFormError("All those dates already have classes!");
      setBulkLoading(false);
      return;
    }

    const rows = newDates.map(date => ({
      title: bulkForm.title,
      description: bulkForm.description || null,
      class_date: date,
      class_time: bulkForm.classTime,
      price_cents: Math.round(parseFloat(bulkForm.price_cents) * 100),
      capacity: parseInt(bulkForm.capacity),
      duration_minutes: parseInt(bulkForm.durationMinutes),
      instructor_id: profile!.id,
      alt_duration_minutes: bulkForm.altDurationMinutes ? parseInt(bulkForm.altDurationMinutes) : null,
      alt_price_cents: bulkForm.altPriceCents ? Math.round(parseFloat(bulkForm.altPriceCents) * 100) : null,
      ...(bulkForm.location ? { location: bulkForm.location } : {}),
    }));

    const { error } = await supabase.from("classes").insert(rows);
    if (!error) {
      setShowBulkForm(false);
      setBulkFormError("");
      loadData();
    } else {
      setBulkFormError("Error creating classes: " + error.message);
    }
    setBulkLoading(false);
  }

  function cancelClass(cls: ClassWithCount) {
    const message = cls.registered_count > 0
      ? `Cancel "${cls.title}"? ${cls.registered_count} member${cls.registered_count !== 1 ? "s" : ""} registered — they'll be notified by email and any pass credits used will be refunded. This cannot be undone.`
      : `Cancel "${cls.title}"? This cannot be undone.`;
    setConfirmDialog({
      message,
      confirmLabel: "Cancel Class",
      action: async () => {
        const res = await fetch("/api/instructor/cancel-class", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: cls.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setActionError(data.error ?? "Failed to cancel class"); return; }
        loadData();
      },
    });
  }

  function deleteClass(cls: ClassWithCount) {
    const warning = cls.registered_count > 0
      ? `"${cls.title}" has ${cls.registered_count} member${cls.registered_count !== 1 ? "s" : ""} registered. Deleting it will permanently remove those registrations and any attendance records for this class. This cannot be undone. Delete anyway?`
      : `Permanently delete "${cls.title}"? This cannot be undone.`;
    setConfirmDialog({
      message: warning,
      action: async () => {
        await supabase.from("classes").delete().eq("id", cls.id);
        loadData();
      },
    });
  }

  function deleteAllUpcomingClasses() {
    if (upcomingClasses.length === 0) return;
    const totalRegistrations = upcomingClasses.reduce((sum, c) => sum + c.registered_count, 0);
    const warning = totalRegistrations > 0
      ? `Delete all ${upcomingClasses.length} upcoming classes? This includes ${totalRegistrations} member registration${totalRegistrations !== 1 ? "s" : ""} across them, which will be permanently removed along with any attendance records. This cannot be undone.`
      : `Delete all ${upcomingClasses.length} upcoming classes? This cannot be undone.`;
    setConfirmDialog({
      message: warning,
      action: async () => {
        await supabase.from("classes").delete().in("id", upcomingClasses.map(c => c.id));
        loadData();
      },
    });
  }

  function deleteAllUpcomingByLocation(label: string, keyword: string) {
    const matching = upcomingClasses.filter(c => c.location?.toLowerCase().includes(keyword.toLowerCase()));
    if (matching.length === 0) return;
    const totalRegistrations = matching.reduce((sum, c) => sum + c.registered_count, 0);
    const warning = totalRegistrations > 0
      ? `Delete all ${matching.length} upcoming ${label} classes? This includes ${totalRegistrations} member registration${totalRegistrations !== 1 ? "s" : ""} across them, which will be permanently removed along with any attendance records. This cannot be undone.`
      : `Delete all ${matching.length} upcoming ${label} classes? This cannot be undone.`;
    setConfirmDialog({
      message: warning,
      action: async () => {
        await supabase.from("classes").delete().in("id", matching.map(c => c.id));
        loadData();
      },
    });
  }

  function resetVideoForm() {
    setShowVideoForm(false);
    setVideoForm({ title: "", description: "", youtube_url: "", class_id: "", is_public: false });
    setVideoFiles([]);
    setVideoUploadProgress(0);
    setVideoUploadIndex(0);
    setVideoMode("upload");
  }

  async function uploadOneVideo(file: File, title: string, sharedFields: { description: string | null; class_id: string | null; is_public: boolean }) {
    const res = await fetch("/api/videos/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    });
    const { uploadUrl, key, error } = await res.json();
    if (!res.ok || !uploadUrl) throw new Error(error || "Could not start upload");

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (ev) => {
        if (ev.lengthComputable) setVideoUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed (status ${xhr.status}): ${xhr.responseText?.slice(0, 300) || "no response body"}`));
      });
      xhr.addEventListener("error", () => reject(new Error("Upload failed: the browser blocked the request before it reached Cloudflare (likely a CORS policy mismatch on the bucket)")));
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });

    await supabase.from("videos").insert({
      title,
      description: sharedFields.description,
      video_type: "r2",
      r2_key: key,
      file_size_bytes: file.size,
      class_id: sharedFields.class_id,
      is_public: sharedFields.is_public,
    });
  }

  async function addVideo(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");

    if (videoMode === "youtube") {
      const youtubeId = getYouTubeId(videoForm.youtube_url);
      if (!youtubeId) {
        setActionError("Invalid YouTube URL");
        return;
      }

      setVideoFormLoading(true);
      await supabase.from("videos").insert({
        title: videoForm.title,
        description: videoForm.description || null,
        video_type: "youtube",
        youtube_url: videoForm.youtube_url,
        youtube_id: youtubeId,
        class_id: videoForm.class_id || null,
        is_public: videoForm.is_public,
      });
      resetVideoForm();
      loadData();
      setVideoFormLoading(false);
      return;
    }

    if (videoFiles.length === 0) {
      setActionError("Choose one or more videos to upload");
      return;
    }

    setVideoFormLoading(true);
    const sharedFields = {
      description: videoForm.description || null,
      class_id: videoForm.class_id || null,
      is_public: videoForm.is_public,
    };
    let uploaded = 0;
    try {
      for (let i = 0; i < videoFiles.length; i++) {
        setVideoUploadIndex(i + 1);
        setVideoUploadProgress(0);
        const file = videoFiles[i];
        const title = videoForm.title.trim()
          ? (videoFiles.length > 1 ? `${videoForm.title.trim()} (${i + 1}/${videoFiles.length})` : videoForm.title.trim())
          : titleFromFilename(file.name);
        await uploadOneVideo(file, title, sharedFields);
        uploaded++;
      }

      resetVideoForm();
      loadData();
    } catch (err) {
      const base = err instanceof Error ? err.message : "Upload failed";
      setActionError(
        videoFiles.length > 1
          ? `${uploaded} of ${videoFiles.length} video${videoFiles.length !== 1 ? "s" : ""} uploaded. "${videoFiles[uploaded]?.name}" failed: ${base}`
          : base
      );
      if (uploaded > 0) loadData();
    } finally {
      setVideoFormLoading(false);
    }
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

  function deleteProduct(id: string) {
    setConfirmDialog({
      message: "Delete this product? This cannot be undone.",
      action: async () => {
        await supabase.from("merch_products").delete().eq("id", id);
        loadData();
      },
    });
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
      applicable_pass_type: discountForm.applicable_pass_type || null,
      active: true,
    });
    if (error) { setActionError(error.message); setDiscountFormLoading(false); return; }
    setShowDiscountForm(false);
    setDiscountForm({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "", applicable_pass_type: "" });
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

  function deleteDiscountCode(id: string) {
    setConfirmDialog({
      message: "Delete this discount code?",
      action: async () => {
        await supabase.from("discount_codes").delete().eq("id", id);
        setDiscountCodes(prev => prev.filter(d => d.id !== id));
      },
    });
  }

  async function createReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewFormLoading(true);
    const { error } = await supabase.from("reviews").insert({
      author_name: reviewForm.author_name.trim(),
      rating: parseInt(reviewForm.rating),
      review_text: reviewForm.review_text.trim(),
    });
    if (error) { setActionError(error.message); setReviewFormLoading(false); return; }
    setShowReviewForm(false);
    setReviewForm({ author_name: "", rating: "5", review_text: "" });
    loadData();
    setReviewFormLoading(false);
  }

  function deleteReview(id: string) {
    setConfirmDialog({
      message: "Delete this review? It will no longer show in the homepage carousel.",
      action: async () => {
        await supabase.from("reviews").delete().eq("id", id);
        setReviews(prev => prev.filter(r => r.id !== id));
      },
    });
  }

  async function addPlaylist(e: React.FormEvent) {
    e.preventDefault();
    setPlaylistFormLoading(true);

    const match = playlistForm.spotify_url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) {
      setActionError("Invalid Spotify playlist URL. It should look like: https://open.spotify.com/playlist/...");
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

  function deletePlaylist(id: string) {
    setConfirmDialog({
      message: "Delete this playlist?",
      action: async () => {
        await supabase.from("playlists").delete().eq("id", id);
        setPlaylists(p => p.filter(pl => pl.id !== id));
      },
    });
  }

  function deleteVideo(id: string) {
    setConfirmDialog({
      message: "Delete this video?",
      action: async () => {
        await fetch("/api/videos/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setVideos((v) => v.filter((vid) => vid.id !== id));
      },
    });
  }

  async function inviteStudent(e: React.FormEvent) {
    e.preventDefault();
    setAddStudentLoading(true);
    setAddStudentError("");
    setAddStudentWarning(null);

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

    setAddStudentForm({ full_name: "", email: "", phone: "" });
    loadData();
    setAddStudentLoading(false);

    if (data.warning) {
      // Account was created but the email failed to send — keep the modal
      // open so the instructor can copy the link and share it manually,
      // instead of silently losing it behind a closed modal.
      setAddStudentWarning({ message: data.warning, url: data.inviteUrl });
    } else {
      setShowAddStudentForm(false);
    }
  }

  async function assignPass(e: React.FormEvent) {
    e.preventDefault();
    if (!assignPassTarget || !assignPassTypeId) return;
    setAssignPassLoading(true);
    setAssignPassError("");

    const res = await fetch("/api/instructor/assign-pass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: assignPassTarget.id,
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

    setShowAssignPassForm(false);
    setAssignPassTarget(null);
    setAssignPassTypeId("");
    setAssignPassClassesRemaining("");
    setAssignPassAmount("");
    loadData();
    setAssignPassLoading(false);
  }

  function debitPass(passId: string) {
    setConfirmDialog({
      message: "Debit 1 class from this pass?",
      confirmLabel: "Debit",
      action: async () => {
        setDebitingPassId(passId);

        const res = await fetch("/api/instructor/debit-pass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setActionError(data.error ?? "Failed to debit pass");
        } else {
          setAllPasses(prev =>
            prev.map(p => p.id === passId ? { ...p, classes_remaining: p.classes_remaining - 1 } : p)
          );
        }
        setDebitingPassId(null);
      },
    });
  }

  function deletePass(passId: string) {
    setConfirmDialog({
      message: "Delete this pass? If it's attached to an upcoming class booking, that booking will be cancelled too so the class spot opens up. This cannot be undone.",
      action: async () => {
        setDeletingPassId(passId);

        const res = await fetch("/api/instructor/delete-pass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passId }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setActionError(data.error ?? "Failed to delete pass");
        } else {
          setAllPasses(prev => prev.filter(p => p.id !== passId));
        }
        setDeletingPassId(null);
      },
    });
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
    setAssignPassClassesRemaining("");
    setAssignPassError("");
    setShowAssignPassForm(true);
  }

  function openAssignInstructor(cls: ClassWithCount) {
    setAssignInstructorTarget(cls);
    setAssignInstructor1(cls.instructor_id ?? "");
    setAssignInstructor2(cls.instructor_id_2 ?? "");
    setAssignInstructorError("");
  }

  async function assignInstructors(e: React.FormEvent) {
    e.preventDefault();
    if (!assignInstructorTarget) return;
    if (assignInstructor2 && assignInstructor2 === assignInstructor1) {
      setAssignInstructorError("Pick two different instructors, or leave the second one blank.");
      return;
    }

    setAssignInstructorLoading(true);
    setAssignInstructorError("");

    const { error } = await supabase
      .from("classes")
      .update({
        instructor_id: assignInstructor1 || null,
        instructor_id_2: assignInstructor2 || null,
      })
      .eq("id", assignInstructorTarget.id);

    if (error) {
      setAssignInstructorError(error.message);
      setAssignInstructorLoading(false);
      return;
    }

    setAssignInstructorTarget(null);
    setAssignInstructorLoading(false);
    loadData();
  }

  const isAdmin = !!profile?.is_admin;

  const tabs = [
    { key: "classes", label: "Classes" },
    { key: "attendance", label: "Attendance" },
    { key: "videos", label: "Videos" },
    { key: "passes", label: "Passes" },
    { key: "students", label: "Members" },
    { key: "playlists", label: "Playlists" },
    ...(isAdmin ? [{ key: "discounts", label: "Discounts" }] as const : []),
    { key: "news", label: "BYLA News" },
    ...(isAdmin && MERCH_ENABLED ? [{ key: "merch", label: "Merch" }] as const : []),
    ...(isAdmin ? [{ key: "reviews", label: "Reviews" }] as const : []),
    { key: "instructors", label: "Instructors" },
  ];

  function openEditBio(inst: Profile) {
    setEditBioTarget(inst);
    setEditBioForm({ title: inst.title ?? "", bio: inst.bio ?? "" });
    setEditBioError("");
  }

  async function saveBio(e: React.FormEvent) {
    e.preventDefault();
    if (!editBioTarget) return;
    setEditBioLoading(true);
    setEditBioError("");
    try {
      const res = await fetch("/api/instructor/update-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: editBioTarget.id, title: editBioForm.title, bio: editBioForm.bio }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setEditBioError(data.error ?? "Something went wrong. Please try again.");
        setEditBioLoading(false);
        return;
      }
      setEditBioTarget(null);
      setEditBioLoading(false);
      loadData();
    } catch (err: any) {
      setEditBioError("Something went wrong: " + (err?.message ?? String(err)));
      setEditBioLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ffffff]">
        <div className="font-body text-gray-400">Loading…</div>
      </div>
    );
  }

  const today = todayLocal();
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
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-2">Instructor</p>
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
              + Add Videos
            </button>
            <button onClick={() => { setBulkFormError(""); setShowBulkForm(true); }} className="btn-secondary py-2 px-4 text-sm">
              + Bulk Create
            </button>
            <button onClick={() => openReviewModal()} className="btn-secondary py-2 px-4 text-sm">
              Send Review Emails
            </button>
            <button onClick={openNewClass} className="btn-primary py-2 px-4 text-sm">
              + New Class
            </button>
          </div>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 font-body text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Today's class banner */}
        {todaysClass && (
          <div className="bg-[#000000] text-white rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-body text-xs uppercase tracking-widest text-[#e2d0fb] mb-1">Today's Class</p>
              <h2 className="font-heading text-lg">{todaysClass.title}</h2>
              <p className="font-body text-sm text-white/70 mt-0.5">
                {formatTime(todaysClass.class_time)} · {todaysClass.registered_count}/{todaysClass.capacity} booked
              </p>
            </div>
            <button
              onClick={() => loadStudents(todaysClass)}
              className="bg-white text-[#000000] font-heading text-sm px-5 py-2.5 rounded-full hover:bg-[#e2d0fb] transition-colors shrink-0"
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
            <div className="bg-[#ffffff] border border-[#e2d0fb] rounded-2xl px-5 py-4 mb-6">
              <p className="font-heading text-sm mb-2 flex items-center gap-1.5">
                <Cake className="w-4 h-4 text-[#000000]" strokeWidth={1.75} /> Upcoming Birthdays
              </p>
              <div className="space-y-1">
                {upcoming.map(s => {
                  const bd = new Date(s.birth_date!);
                  const thisYear = new Date(new Date().getFullYear(), bd.getMonth(), bd.getDate());
                  const diff = Math.round((thisYear.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                  const label = diff === 0 ? "Today!" : diff === 1 ? "Tomorrow" : `in ${diff} days`;
                  return (
                    <p key={s.id} className="font-body text-sm">
                      <strong>{s.full_name ?? s.email}</strong> — {bd.toLocaleDateString("en-AU", { day: "numeric", month: "long" })} <span className="text-[#000000]">({label})</span>
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
            { label: "Upcoming classes", value: upcomingClasses.length, color: "bg-[#ffffff]" },
            { label: "Total members", value: allStudents.length, color: "bg-[#ffffff]" },
            { label: "Videos", value: videos.length, color: "bg-[#ffffff]" },
            { label: "Active passes", value: allPasses.filter(p => p.classes_remaining > 0 && (!p.expires_at || new Date(p.expires_at) > new Date())).length, color: "bg-[#ffffff]" },
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
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`font-body text-sm px-4 py-2.5 -mb-px border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[#000000] text-[#000000]"
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
                <button onClick={openNewClass} className="btn-primary">New Class</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-heading text-sm uppercase tracking-widest text-[#000000]">Upcoming</h3>
                  {isAdmin && (
                    <div className="flex items-center flex-wrap gap-2">
                      <button onClick={() => deleteAllUpcomingByLocation("Manly", "Manly")} className="font-body text-xs text-[#000000] border border-[#000000] hover:bg-[#000000]/10 rounded-md px-3 py-1.5">
                        Remove All Upcoming Manly
                      </button>
                      <button onClick={() => deleteAllUpcomingByLocation("Alexandria", "Alexandria")} className="font-body text-xs text-[#000000] border border-[#000000] hover:bg-[#000000]/10 rounded-md px-3 py-1.5">
                        Remove All Upcoming Alexandria
                      </button>
                      <button onClick={deleteAllUpcomingClasses} className="font-body text-xs text-white bg-[#000000] hover:bg-black/80 rounded-md px-3 py-1.5">
                        Remove All Upcoming
                      </button>
                    </div>
                  )}
                </div>
                {upcomingClasses.map((cls) => (
                  <ClassRow key={cls.id} cls={cls} instructors={instructors} onAttendance={() => loadStudents(cls)} onCancel={() => cancelClass(cls)} onDelete={() => deleteClass(cls)} onBookForMember={() => openBookForMember(cls)} onAssignInstructor={() => openAssignInstructor(cls)} onEdit={() => openEditClass(cls)} canDelete={isAdmin || cls.instructor_id === profile?.id || cls.instructor_id_2 === profile?.id} isToday={cls.class_date === today} />
                ))}
                {pastClasses.length > 0 && (
                  <>
                    <h3 className="font-heading text-sm uppercase tracking-widest text-gray-400 mt-8">Past</h3>
                    {pastClasses.slice(0, 5).map((cls) => (
                      <ClassRow key={cls.id} cls={cls} instructors={instructors} onAttendance={() => loadStudents(cls)} onCancel={() => cancelClass(cls)} onDelete={() => deleteClass(cls)} onAssignInstructor={() => openAssignInstructor(cls)} onEdit={() => openEditClass(cls)} canDelete={isAdmin || cls.instructor_id === profile?.id || cls.instructor_id_2 === profile?.id} past />
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
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#e2d0fb]/50 flex items-center justify-center text-xs font-heading overflow-hidden shrink-0">
                              {s.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={s.avatar_url} alt="" className="object-cover w-full h-full" />
                              ) : (
                                (s.full_name ?? s.email)[0]?.toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm font-body">
                                {s.full_name ?? "—"}
                                {s.guest_count > 0 && (
                                  <span className="ml-2 badge bg-[#e2d0fb]/50 text-black">+{s.guest_count} guest</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 font-body">{s.email}</p>
                            </div>
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
                                  ? "bg-[#000000] border-[#000000] text-white"
                                  : "border-gray-300 hover:border-[#000000]"
                              }`}
                            >
                              {s.attended ? <Check className="w-4 h-4 mx-auto" strokeWidth={2.5} /> : ""}
                            </button>
                          </div>
                        </div>
                      ))}
                      {walkIns.map((w) => (
                        <div key={w.id} className="flex items-center justify-between px-5 py-3 bg-[#ffffff]">
                          <div>
                            <p className="font-medium text-sm font-body">
                              {w.name}
                              <span className="ml-2 badge bg-[#e2d0fb]/50 text-black text-xs">Walk-in</span>
                              {w.payment_type === "pass" && <span className="ml-1 badge bg-blue-100 text-blue-700 text-xs">Pass deducted</span>}
                            </p>
                            <p className="text-xs text-gray-400 font-body">{w.payment_type === "complimentary" ? "Complimentary" : "Pass"}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-[#000000] border-2 border-[#000000] text-white flex items-center justify-center shrink-0"><Check className="w-4 h-4" strokeWidth={2.5} /></div>
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
                <button onClick={() => setShowVideoForm(true)} className="btn-primary">Add Videos</button>
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
                      <div className="aspect-square bg-[#ffffff]">
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
                      <p className="font-heading text-lg text-[#000000] mt-1">{formatPrice(p.price_cents)}</p>
                      {p.sizes && p.sizes.length > 0 && (
                        <p className="font-body text-xs text-gray-400 mt-1">Sizes: {p.sizes.join(", ")}</p>
                      )}
                      <div className="flex gap-3 mt-auto pt-4">
                        <button onClick={() => toggleProductActive(p)} className="font-body text-xs text-[#000000] hover:underline">
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
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isActive && (
                          <button
                            onClick={() => debitPass(p.id)}
                            disabled={debitingPassId === p.id}
                            className="font-body text-xs text-[#000000] hover:underline disabled:opacity-50"
                          >
                            {debitingPassId === p.id ? "…" : "Debit 1"}
                          </button>
                        )}
                        <button
                          onClick={() => deletePass(p.id)}
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
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e2d0fb]/50 flex items-center justify-center text-sm font-heading overflow-hidden shrink-0">
                        {s.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatar_url} alt="" className="object-cover w-full h-full" />
                        ) : (
                          (s.full_name ?? s.email)[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm font-body">{s.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-500 font-body">{s.email}</p>
                        <p className="text-xs text-gray-400 font-body inline-flex items-center gap-1">
                          {s.phone ?? "—"} · {new Date(s.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          {s.birth_date && (
                            <> · <Cake className="w-3 h-3 text-[#000000]" strokeWidth={1.75} /> {new Date(s.birth_date).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={() => openAssignPass(s)}
                        className="font-body text-xs text-[#000000] hover:underline"
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
              <div className="card divide-y divide-gray-50 overflow-hidden">
                {discountCodes.map(d => (
                  <div key={d.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading tracking-wider">{d.code}</span>
                        <span className={d.active ? "badge-confirmed" : "badge bg-gray-100 text-gray-500"}>
                          {d.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-body mt-1">
                        {d.discount_type === "percentage" ? `${d.discount_value}% off` : `$${(d.discount_value / 100).toFixed(0)} off`}
                        {" · "}{d.uses_count} use{d.uses_count !== 1 ? "s" : ""}{d.max_uses ? `/${d.max_uses}` : ""}
                        {" · "}{PASS_TYPE_LABELS[d.applicable_pass_type as keyof typeof PASS_TYPE_LABELS] ?? "All passes"}
                        {" · "}
                        {editingDiscountId === d.id ? (
                          <input
                            type="date"
                            className="input py-1 px-2 text-xs w-36 inline-block align-middle"
                            value={editDiscountExpiresAt}
                            onChange={e => setEditDiscountExpiresAt(e.target.value)}
                          />
                        ) : (
                          d.expires_at ? `Expires ${new Date(d.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : "Never expires"
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {editingDiscountId === d.id ? (
                        <>
                          <button onClick={() => saveDiscountExpiry(d.id)} className="font-body text-xs text-green-600 hover:underline">Save</button>
                          <button onClick={() => setEditingDiscountId(null)} className="font-body text-xs text-gray-400 hover:underline">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditingDiscountId(d.id); setEditDiscountExpiresAt(d.expires_at ? d.expires_at.split("T")[0] : ""); }} className="font-body text-xs text-gray-500 hover:underline">Edit</button>
                      )}
                      <button onClick={() => toggleDiscountActive(d.id, d.active)} className="font-body text-xs text-[#000000] hover:underline">
                        {d.active ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => deleteDiscountCode(d.id)} className="font-body text-xs text-red-400 hover:text-red-600">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REVIEWS TAB (admin only) */}
        {activeTab === "reviews" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-body text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""} · shown in a carousel on the homepage</p>
              <button onClick={() => setShowReviewForm(true)} className="btn-primary py-2 px-4 text-sm">
                + New Review
              </button>
            </div>
            {reviews.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400 mb-4">No reviews yet. Add one to start the homepage carousel.</p>
                <button onClick={() => setShowReviewForm(true)} className="btn-primary">Add Review</button>
              </div>
            ) : (
              <div className="card divide-y divide-gray-50 overflow-hidden">
                {reviews.map(r => (
                  <div key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-heading">{r.author_name}</span>
                        <span className="text-amber-400 text-xs tracking-tight">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      </div>
                      <p className="text-sm text-gray-600 font-body">{r.review_text}</p>
                    </div>
                    <button onClick={() => deleteReview(r.id)} className="font-body text-xs text-red-400 hover:text-red-600 shrink-0">
                      Delete
                    </button>
                  </div>
                ))}
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
                  <div>
                    <label className="label">Image (optional)</label>
                    <input
                      ref={newsImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) readImageAsBase64(file, setNewsImageError, setNewsImage);
                      }}
                    />
                    {newsImage ? (
                      <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={newsImage} alt="" className="h-24 w-24 object-cover rounded-xl" />
                        <button type="button" onClick={() => setNewsImage(null)} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5">
                          <X className="w-3 h-3" strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => newsImageInputRef.current?.click()} className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" strokeWidth={1.75} /> Add image
                      </button>
                    )}
                    {newsImageError && <p className="font-body text-xs text-red-500 mt-1">{newsImageError}</p>}
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
                    <div key={post.id} className={`card p-5 ${post.pinned ? "border-2 border-[#000000]" : ""}`}>
                      {isEditing ? (
                        <form onSubmit={saveEditNewsPost} className="space-y-3">
                          <input className="input" value={editNewsForm.title} onChange={e => setEditNewsForm(f => ({ ...f, title: e.target.value }))} required />
                          <textarea className="input min-h-[100px]" value={editNewsForm.body} onChange={e => setEditNewsForm(f => ({ ...f, body: e.target.value }))} required />
                          <div>
                            <input
                              ref={editNewsImageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                if (file) readImageAsBase64(file, setEditNewsImageError, setEditNewsImage);
                              }}
                            />
                            {(editNewsImage ?? editNewsForm.image_url) ? (
                              <div className="relative inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={editNewsImage ?? editNewsForm.image_url ?? undefined} alt="" className="h-20 w-20 object-cover rounded-xl" />
                                <button type="button" onClick={() => { setEditNewsImage(null); setEditNewsForm(f => ({ ...f, image_url: null })); }} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5">
                                  <X className="w-3 h-3" strokeWidth={2} />
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => editNewsImageInputRef.current?.click()} className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" strokeWidth={1.75} /> Add image
                              </button>
                            )}
                            {editNewsImageError && <p className="font-body text-xs text-red-500 mt-1">{editNewsImageError}</p>}
                          </div>
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
                              <CatIcon className="w-4 h-4 shrink-0 text-[#000000]" strokeWidth={1.75} />
                              {post.title} {post.pinned && <span className="ml-1 badge bg-[#000000] text-white text-xs">Pinned</span>}
                            </p>
                            <p className="font-body text-sm text-gray-600 mt-1 whitespace-pre-wrap"><Linkify text={post.body} /></p>
                            <p className="font-body text-xs text-gray-400 mt-2">{new Date(post.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setEditingNewsId(post.id); setEditNewsForm({ title: post.title, body: post.body, category: post.category, pinned: post.pinned, image_url: post.image_url ?? null }); setEditNewsImage(null); setEditNewsImageError(""); }} className="font-body text-xs text-gray-500 hover:underline">Edit</button>
                            <button onClick={() => togglePin(post.id, post.pinned)} className="font-body text-xs text-[#000000] hover:underline">{post.pinned ? "Unpin" : "Pin"}</button>
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

        {/* INSTRUCTORS TAB */}
        {activeTab === "instructors" && (
          <div>
            <p className="font-body text-sm text-gray-500 mb-5">{instructors.length} instructor{instructors.length !== 1 ? "s" : ""}</p>
            {instructors.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-body text-gray-400">No instructors yet.</p>
              </div>
            ) : (
              <div className="card divide-y divide-gray-50 overflow-hidden">
                {instructors.map((inst) => (
                  <div key={inst.id} className="px-5 py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm font-body">{inst.full_name ?? inst.email}</p>
                      {inst.title && <p className="font-body text-xs text-[#000000] mt-0.5">{inst.title}</p>}
                      <p className="font-body text-sm text-gray-500 mt-1 whitespace-pre-wrap">{inst.bio || "No bio yet."}</p>
                    </div>
                    {(isAdmin || inst.id === profile?.id) && (
                      <button onClick={() => openEditBio(inst)} className="font-body text-xs text-[#000000] hover:underline shrink-0">
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREATE CLASS MODAL */}
        {showClassForm && (
          <Modal title={editingClassId ? "Edit Class" : "New Class"} onClose={() => { setShowClassForm(false); setEditingClassId(null); }}>
            <form onSubmit={saveClass} className="space-y-4">
              <div>
                <label className="label">Class Title</label>
                <input
                  className="input"
                  placeholder="e.g. Reggaeton Basics"
                  value={classForm.title}
                  onChange={e => setClassForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={classForm.class_date}
                    onChange={e => setClassForm(f => ({ ...f, class_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Time</label>
                  <input
                    type="time"
                    className="input"
                    value={classForm.class_time}
                    onChange={e => setClassForm(f => ({ ...f, class_time: e.target.value }))}
                    required
                  />
                </div>
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
              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <label className="label">Duration (mins)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="45"
                    value={classForm.durationMinutes}
                    onChange={e => setClassForm(f => ({ ...f, durationMinutes: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Longer session option (optional)</label>
                <p className="font-body text-xs text-gray-400 mb-2">e.g. offer a 90 min option alongside the default 60 min class</p>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="Alt duration (mins)"
                    value={classForm.altDurationMinutes}
                    onChange={e => setClassForm(f => ({ ...f, altDurationMinutes: e.target.value }))}
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Alt price (AUD)"
                    value={classForm.altPriceCents}
                    onChange={e => setClassForm(f => ({ ...f, altPriceCents: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Location</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setClassForm(f => ({ ...f, location: LOCATION_ALEXANDRIA, description: f.isSpecial ? f.description : DESCRIPTION_ALEXANDRIA }))} className="btn-secondary py-1.5 px-3 text-xs">Alexandria</button>
                  <button type="button" onClick={() => setClassForm(f => ({ ...f, location: LOCATION_MANLY, description: f.isSpecial ? f.description : DESCRIPTION_MANLY }))} className="btn-secondary py-1.5 px-3 text-xs">Manly</button>
                </div>
                <input
                  className="input"
                  placeholder="e.g. BYLA Alexandria, or BYLA Manly"
                  value={classForm.location}
                  onChange={e => setClassForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isSpecial"
                  type="checkbox"
                  checked={classForm.isSpecial}
                  onChange={e => setClassForm(f => ({ ...f, isSpecial: e.target.checked }))}
                />
                <label htmlFor="isSpecial" className="label mb-0">This is a one-off special class (pop-up, collab, video shooting, etc.)</label>
              </div>
              {classForm.isSpecial && (
                <div>
                  <label className="label">Special label</label>
                  <input
                    className="input"
                    placeholder="e.g. Pop-up, Collab, Video Shooting"
                    value={classForm.specialLabel}
                    onChange={e => setClassForm(f => ({ ...f, specialLabel: e.target.value }))}
                  />
                </div>
              )}
              {classFormError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">{classFormError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowClassForm(false); setEditingClassId(null); }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={classFormLoading}>
                  {classFormLoading ? "Saving…" : editingClassId ? "Save Changes" : "Create Class"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* BULK CREATE RECURRING CLASSES MODAL */}
        {showBulkForm && (
          <Modal title="Bulk Create Recurring Classes" onClose={() => { setShowBulkForm(false); setBulkFormError(""); }}>
            <form onSubmit={bulkCreateClasses} className="space-y-4">
              <p className="font-body text-sm text-gray-500">Creates a class for every upcoming date on the chosen weekday that doesn't already have one.</p>
              {bulkFormError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 font-body text-sm text-red-700">{bulkFormError}</div>
              )}
              <div>
                <label className="label">Class Title</label>
                <input
                  className="input"
                  placeholder="e.g. Reggaeton Class"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Day of week</label>
                  <select
                    className="input"
                    value={bulkForm.dayOfWeek}
                    onChange={e => setBulkForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="label">Time</label>
                  <input
                    className="input"
                    type="time"
                    value={bulkForm.classTime}
                    onChange={e => setBulkForm(f => ({ ...f, classTime: e.target.value }))}
                    required
                  />
                </div>
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
              <div>
                <label className="label">Location</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setBulkForm(f => ({ ...f, location: LOCATION_ALEXANDRIA, description: DESCRIPTION_ALEXANDRIA }))} className="btn-secondary py-1.5 px-3 text-xs">Alexandria</button>
                  <button type="button" onClick={() => setBulkForm(f => ({ ...f, location: LOCATION_MANLY, description: DESCRIPTION_MANLY }))} className="btn-secondary py-1.5 px-3 text-xs">Manly</button>
                </div>
                <input
                  className="input"
                  placeholder="e.g. BYLA Alexandria, or BYLA Manly"
                  value={bulkForm.location}
                  onChange={e => setBulkForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="label">Duration (mins)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={bulkForm.durationMinutes}
                    onChange={e => setBulkForm(f => ({ ...f, durationMinutes: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Longer session option (optional)</label>
                <p className="font-body text-xs text-gray-400 mb-2">e.g. offer a 90 min option alongside the default 60 min class</p>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="Alt duration (mins)"
                    value={bulkForm.altDurationMinutes}
                    onChange={e => setBulkForm(f => ({ ...f, altDurationMinutes: e.target.value }))}
                  />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Alt price (AUD)"
                    value={bulkForm.altPriceCents}
                    onChange={e => setBulkForm(f => ({ ...f, altPriceCents: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowBulkForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={bulkLoading}>
                  {bulkLoading ? "Creating…" : `Create all ${DAY_NAMES_PLURAL[parseInt(bulkForm.dayOfWeek)]}`}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ADD VIDEO MODAL */}
        {showVideoForm && (
          <Modal title="Add Videos" onClose={resetVideoForm}>
            <form onSubmit={addVideo} className="space-y-4">
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setVideoMode("upload")}
                  className={`flex-1 py-2 rounded-md text-sm font-body transition-colors ${videoMode === "upload" ? "bg-white shadow text-[#000000] font-medium" : "text-gray-500"}`}
                >
                  Upload video
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMode("youtube")}
                  className={`flex-1 py-2 rounded-md text-sm font-body transition-colors ${videoMode === "youtube" ? "bg-white shadow text-[#000000] font-medium" : "text-gray-500"}`}
                >
                  YouTube URL
                </button>
              </div>
              <div>
                <label className="label">Title{videoMode === "upload" && " (optional)"}</label>
                <input
                  className="input"
                  placeholder={videoMode === "upload" ? "Leave blank to use each file's name" : "e.g. Reggaeton Basics, 16 May"}
                  value={videoForm.title}
                  onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))}
                  required={videoMode === "youtube"}
                />
              </div>
              {videoMode === "youtube" ? (
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
              ) : (
                <div>
                  <label className="label">Video file(s)</label>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-[#000000] transition-colors">
                    <Upload className="w-6 h-6 text-[#000000]" strokeWidth={1.5} />
                    <span className="font-body text-sm text-gray-500 text-center px-4">
                      {videoFiles.length === 0
                        ? "Tap to choose one or more videos from your camera roll"
                        : `${videoFiles.length} video${videoFiles.length !== 1 ? "s" : ""} selected`}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={e => setVideoFiles(Array.from(e.target.files ?? []))}
                    />
                  </label>
                  {videoFiles.length > 1 && (
                    <ul className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
                      {videoFiles.map((f, i) => (
                        <li key={i} className="font-body text-xs text-gray-500 truncate">{f.name}</li>
                      ))}
                    </ul>
                  )}
                  {videoFormLoading && (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#000000] transition-all" style={{ width: `${videoUploadProgress}%` }} />
                      </div>
                      <p className="font-body text-xs text-gray-400 mt-1">
                        {videoFiles.length > 1
                          ? `Uploading video ${videoUploadIndex} of ${videoFiles.length} — ${videoUploadProgress}%`
                          : `Uploading… ${videoUploadProgress}%`}
                      </p>
                    </div>
                  )}
                </div>
              )}
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
                  className="w-4 h-4 accent-[#000000]"
                />
                <label htmlFor="is_public" className="font-body text-sm text-gray-700">
                  Visible to all members (not just paid registrants)
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetVideoForm} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={videoFormLoading}>
                  {videoFormLoading
                    ? (videoMode === "upload"
                        ? (videoFiles.length > 1 ? `Uploading ${videoUploadIndex}/${videoFiles.length}…` : "Uploading…")
                        : "Adding…")
                    : (videoMode === "upload" && videoFiles.length > 1 ? `Add ${videoFiles.length} Videos` : "Add Video")}
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
              <div>
                <label className="label">Applies to</label>
                <select
                  className="input"
                  value={discountForm.applicable_pass_type}
                  onChange={e => setDiscountForm(f => ({ ...f, applicable_pass_type: e.target.value }))}
                >
                  <option value="">All passes</option>
                  <option value="casual">Casual Class (drop-in) only</option>
                  <option value="five">5-Class Pack only</option>
                  <option value="ten">10-Class Pack only</option>
                </select>
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

        {/* NEW REVIEW MODAL */}
        {showReviewForm && (
          <Modal title="New Review" onClose={() => setShowReviewForm(false)}>
            <form onSubmit={createReview} className="space-y-4">
              <div>
                <label className="label">Reviewer name</label>
                <input
                  className="input"
                  placeholder="e.g. Sofia R."
                  value={reviewForm.author_name}
                  onChange={e => setReviewForm(f => ({ ...f, author_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Rating</label>
                <select
                  className="input"
                  value={reviewForm.rating}
                  onChange={e => setReviewForm(f => ({ ...f, rating: e.target.value }))}
                >
                  <option value="5">★★★★★ (5)</option>
                  <option value="4">★★★★☆ (4)</option>
                  <option value="3">★★★☆☆ (3)</option>
                  <option value="2">★★☆☆☆ (2)</option>
                  <option value="1">★☆☆☆☆ (1)</option>
                </select>
              </div>
              <div>
                <label className="label">Review text</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="Paste or type the review here…"
                  value={reviewForm.review_text}
                  onChange={e => setReviewForm(f => ({ ...f, review_text: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowReviewForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={reviewFormLoading}>
                  {reviewFormLoading ? "Adding…" : "Add Review"}
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
                  placeholder="e.g. Reggaeton Vibes, Afro & Latin"
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
                  <div className="bg-[#9b7fc7]/10 border border-[#9b7fc7]/40 rounded-xl p-4 font-body text-xs text-gray-600 leading-relaxed">
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
                      className="block w-full font-body text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-heading file:bg-[#000000] file:text-white hover:file:bg-[#000000]/80 cursor-pointer"
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
                      <div className="max-h-48 overflow-y-auto overflow-x-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-xs font-body">
                          <thead className="bg-[#ffffff] sticky top-0">
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
          <Modal title="Invite Member" onClose={() => { setShowAddStudentForm(false); setAddStudentError(""); setAddStudentWarning(null); }}>
            {addStudentWarning ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 font-body text-sm text-amber-800">
                  {addStudentWarning.message}
                </div>
                <div>
                  <label className="label">Invite link</label>
                  <input
                    className="input font-mono text-xs"
                    readOnly
                    value={addStudentWarning.url}
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <p className="font-body text-xs text-gray-400 mt-1">Click to select, then copy and share it with them directly (e.g. by text).</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddStudentForm(false); setAddStudentWarning(null); }}
                  className="btn-primary w-full justify-center"
                >
                  Done
                </button>
              </div>
            ) : (
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
            )}
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
              <button type="button" onClick={() => setAddToRollMode("member")} className={`flex-1 py-2 font-body text-sm transition-colors ${addToRollMode === "member" ? "bg-[#000000] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                Existing Member
              </button>
              <button type="button" onClick={() => setAddToRollMode("walkin")} className={`flex-1 py-2 font-body text-sm transition-colors ${addToRollMode === "walkin" ? "bg-[#000000] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
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

        {/* ASSIGN INSTRUCTOR MODAL */}
        {assignInstructorTarget && (
          <Modal title={`Assign Instructor — ${assignInstructorTarget.title}`} onClose={() => setAssignInstructorTarget(null)}>
            <form onSubmit={assignInstructors} className="space-y-4">
              {!isAdmin && (
                <p className="font-body text-xs text-gray-400">You can only assign yourself to a class.</p>
              )}
              <div>
                <label className="label">Instructor</label>
                <select
                  className="input"
                  value={assignInstructor1}
                  onChange={e => setAssignInstructor1(e.target.value)}
                >
                  <option value="">— None —</option>
                  {(isAdmin ? instructors : instructors.filter(i => i.id === profile?.id || i.id === assignInstructor1 || i.id === assignInstructor2)).map(i => (
                    <option key={i.id} value={i.id}>{i.full_name ?? i.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Second instructor (optional)</label>
                <select
                  className="input"
                  value={assignInstructor2}
                  onChange={e => setAssignInstructor2(e.target.value)}
                >
                  <option value="">— None —</option>
                  {(isAdmin ? instructors : instructors.filter(i => i.id === profile?.id || i.id === assignInstructor1 || i.id === assignInstructor2)).map(i => (
                    <option key={i.id} value={i.id}>{i.full_name ?? i.email}</option>
                  ))}
                </select>
              </div>
              {assignInstructorError && (
                <p className="font-body text-sm text-red-500">{assignInstructorError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAssignInstructorTarget(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={assignInstructorLoading}>
                  {assignInstructorLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* EDIT INSTRUCTOR BIO MODAL */}
        {editBioTarget && (
          <Modal title={`Edit Bio — ${editBioTarget.full_name ?? editBioTarget.email}`} onClose={() => setEditBioTarget(null)}>
            <form onSubmit={saveBio} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Founder & Lead Instructor"
                  value={editBioForm.title}
                  onChange={e => setEditBioForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea
                  className="input min-h-[120px]"
                  placeholder="Tell people a bit about them…"
                  value={editBioForm.bio}
                  onChange={e => setEditBioForm(f => ({ ...f, bio: e.target.value }))}
                />
              </div>
              {editBioError && (
                <p className="font-body text-sm text-red-500">{editBioError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditBioTarget(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={editBioLoading}>
                  {editBioLoading ? "Saving…" : "Save"}
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
                <label className="label">
                  Classes remaining
                  <span className="font-body text-xs text-gray-400 ml-1">(optional — for migrating a client with an already part-used pass)</span>
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
                <p className="font-body text-xs text-gray-400 mt-1">
                  Sets the starting balance directly, so you don't need to debit classes afterwards (which would email the student each time).
                </p>
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
              {assignPassError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">{assignPassError}</div>
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
                  className={`flex-1 py-1.5 rounded-lg font-body text-xs font-medium transition-colors ${reviewMode === "class" ? "bg-[#000000] text-white" : "text-gray-500"}`}
                >
                  First-timers by class
                </button>
                <button
                  type="button"
                  onClick={() => switchReviewMode("any")}
                  className={`flex-1 py-1.5 rounded-lg font-body text-xs font-medium transition-colors ${reviewMode === "any" ? "bg-[#000000] text-white" : "text-gray-500"}`}
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

        {confirmDialog && (
          <ConfirmDialog
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            onCancel={() => setConfirmDialog(null)}
            onConfirm={() => { const action = confirmDialog.action; setConfirmDialog(null); action(); }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

function ClassRow({ cls, instructors, onAttendance, onCancel, onDelete, onBookForMember, onAssignInstructor, onEdit, canDelete, past, isToday }: {
  cls: ClassWithCount;
  instructors: Profile[];
  onAttendance: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onBookForMember?: () => void;
  onAssignInstructor: () => void;
  onEdit: () => void;
  canDelete: boolean;
  past?: boolean;
  isToday?: boolean;
}) {
  const instructorNames = [cls.instructor_id, cls.instructor_id_2]
    .map(id => instructors.find(i => i.id === id))
    .filter((i): i is Profile => !!i && i.show_on_instructors_page)
    .map(i => i.full_name)
    .join(" & ");

  return (
    <div className={`card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cls.is_cancelled ? "opacity-60" : ""} ${isToday ? "ring-2 ring-[#000000]" : ""}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          {cls.is_cancelled ? (
            <span className="badge badge-cancelled">Cancelled</span>
          ) : isToday ? (
            <span className="badge bg-[#000000] text-white">Today</span>
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
          })} · {formatTime(cls.class_time)}
        </p>
        <button onClick={onAssignInstructor} className="font-body text-xs text-[#000000] italic mt-1">
          {instructorNames ? `w/ ${instructorNames}` : "Assign instructor"}
        </button>
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
          <button onClick={onEdit} className="font-body text-xs text-[#000000] hover:underline">
            Edit
          </button>
          {!cls.is_cancelled && !past && (
            <button onClick={onCancel} className="font-body text-xs text-red-400 hover:text-red-600 underline">
              Cancel
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="font-body text-xs text-red-400 hover:text-red-600 underline">
              Delete
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
        {video.video_type === "r2" ? (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-10 h-10 text-white/60" strokeWidth={1.5} />
          </div>
        ) : (
          <>
            <img
              src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
              alt={video.title}
              className="w-full h-full object-cover opacity-80"
            />
            <a
              href={video.youtube_url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-[#000000] ml-1" />
              </div>
            </a>
          </>
        )}
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
