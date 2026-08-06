import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { buildBookingConfirmationEmailHtml } from "@/lib/booking-confirmation-email";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function sendBookingConfirmation(admin: ReturnType<typeof adminClient>, studentId: string, classId: string, guestCount: number) {
  const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", studentId).single();
  if (!profile?.email) return;

  const { data: cls } = await admin.from("classes").select("title, class_date").eq("id", classId).single();
  if (!cls) return;

  const classDate = new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const firstName = (profile.full_name ?? "dancer").split(" ")[0];

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: `[Studio Name] <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
    to: profile.email,
    subject: `You're booked – ${cls.title}`,
    html: buildBookingConfirmationEmailHtml({ firstName, classTitle: cls.title, classDate, guestCount }),
  }).catch((e) => console.error("Booking confirmation email error:", e));
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId, studentId, passId, guestCount = 0 } = await req.json();
  if (!classId || !studentId) return NextResponse.json({ error: `Missing fields (classId: ${classId}, studentId: ${studentId})` }, { status: 400 });

  const admin = adminClient();

  // Check class exists and isn't full
  const { data: cls, error: clsError } = await admin.from("classes").select("*").eq("id", classId).single();
  if (clsError) return NextResponse.json({ error: `DEBUG lookup error for classId ${classId}: ${clsError.message}` }, { status: 400 });
  if (!cls) return NextResponse.json({ error: `DEBUG no class found for classId ${classId}` }, { status: 400 });
  if (cls.is_cancelled) return NextResponse.json({ error: "DEBUG class is marked cancelled" }, { status: 400 });

  const { data: regCount } = await admin.from("class_registration_counts").select("registered_count").eq("class_id", classId).single();
  if ((regCount?.registered_count ?? 0) >= cls.capacity) return NextResponse.json({ error: "Class is full" }, { status: 400 });

  // Check not already registered
  const { data: existing } = await admin.from("registrations").select("id, guest_count, pass_id")
    .eq("class_id", classId).eq("student_id", studentId).not("status", "eq", "cancelled").single();

  // If already booked and adding guests, update guest count and deduct extra credits
  if (existing && guestCount > (existing.guest_count ?? 0)) {
    if (passId) {
      const { data: pass } = await admin.from("passes").select("*, pass_types(*)").eq("id", passId).eq("student_id", studentId).single();
      if (!pass) return NextResponse.json({ error: "Pass not found" }, { status: 404 });
      const maxGuests = (pass as any).pass_types?.max_guests ?? 0;
      const extraCredits = Math.max(0, guestCount - maxGuests) - Math.max(0, (existing.guest_count ?? 0) - maxGuests);
      if (pass.classes_remaining < extraCredits) return NextResponse.json({ error: "Not enough credits on this pass" }, { status: 400 });
      await admin.from("registrations").update({ guest_count: guestCount, pass_id: passId }).eq("id", existing.id);
      await admin.from("passes").update({ classes_remaining: pass.classes_remaining - extraCredits }).eq("id", passId);
    } else {
      await admin.from("registrations").update({ guest_count: guestCount }).eq("id", existing.id);
    }
    return NextResponse.json({ success: true });
  }

  if (existing) return NextResponse.json({ error: "Member is already booked for this class" }, { status: 400 });

  // Check for cancelled registration to reactivate
  const { data: cancelled } = await admin.from("registrations").select("id")
    .eq("class_id", classId).eq("student_id", studentId).eq("status", "cancelled").single();

  // Deduct pass if provided
  if (passId) {
    const { data: pass } = await admin.from("passes").select("*, pass_types(*)").eq("id", passId).eq("student_id", studentId).single();
    if (!pass) return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    const maxGuests = (pass as any).pass_types?.max_guests ?? 0;
    const creditsNeeded = 1 + Math.max(0, guestCount - maxGuests);
    if (pass.classes_remaining < creditsNeeded) return NextResponse.json({ error: "Not enough credits on this pass" }, { status: 400 });

    if (cancelled) {
      await admin.from("registrations").update({ status: "confirmed", pass_id: passId, payment_type: "pass", guest_count: guestCount }).eq("id", cancelled.id);
    } else {
      await admin.from("registrations").insert({ class_id: classId, student_id: studentId, status: "confirmed", pass_id: passId, payment_type: "pass", guest_count: guestCount });
    }
    await admin.from("passes").update({ classes_remaining: pass.classes_remaining - creditsNeeded }).eq("id", passId);
  } else {
    // Complimentary booking (no pass)
    if (cancelled) {
      await admin.from("registrations").update({ status: "confirmed", pass_id: null, payment_type: "complimentary", guest_count: guestCount }).eq("id", cancelled.id);
    } else {
      await admin.from("registrations").insert({ class_id: classId, student_id: studentId, status: "confirmed", pass_id: null, payment_type: "complimentary", guest_count: guestCount });
    }
  }

  await sendBookingConfirmation(admin, studentId, classId, guestCount);

  return NextResponse.json({ success: true });
}
