import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId, passId } = await req.json();

  // Verify the pass belongs to this user and has credits
  const { data: pass } = await supabase
    .from("passes")
    .select("*, pass_types(*)")
    .eq("id", passId)
    .eq("student_id", user.id)
    .single();

  if (!pass) return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  if (pass.classes_remaining <= 0) return NextResponse.json({ error: "No classes remaining on this pass" }, { status: 400 });
  if (pass.expires_at && new Date(pass.expires_at) < new Date()) {
    return NextResponse.json({ error: "This pass has expired" }, { status: 400 });
  }

  // Check class exists and has capacity
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (!cls || cls.is_cancelled) return NextResponse.json({ error: "Class not available" }, { status: 400 });

  const { data: regCount } = await supabase
    .from("class_registration_counts")
    .select("registered_count")
    .eq("class_id", classId)
    .single();

  const currentCount = regCount?.registered_count ?? 0;
  if (currentCount >= cls.capacity) return NextResponse.json({ error: "Class is full" }, { status: 400 });

  // Check not already registered
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .not("status", "eq", "cancelled")
    .single();

  if (existing) return NextResponse.json({ error: "Already registered" }, { status: 400 });

  // Check for existing cancelled registration to reactivate
  const { data: cancelled } = await supabase
    .from("registrations")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .eq("status", "cancelled")
    .single();

  let regError;
  if (cancelled) {
    // Reactivate the cancelled registration
    ({ error: regError } = await supabase
      .from("registrations")
      .update({ status: "confirmed", pass_id: passId, payment_type: "pass", guest_count: 0 })
      .eq("id", cancelled.id));
  } else {
    ({ error: regError } = await supabase.from("registrations").insert({
      class_id: classId,
      student_id: user.id,
      status: "confirmed",
      pass_id: passId,
      payment_type: "pass",
      guest_count: 0,
    }));
  }

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });

  await supabase
    .from("passes")
    .update({ classes_remaining: pass.classes_remaining - 1 })
    .eq("id", passId);

  // Notify instructor
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
  const classDate = new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  await resend.emails.send({
    from: `THE A.M Dance Club <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
    to: process.env.NEXT_PUBLIC_INSTRUCTOR_EMAIL!,
    subject: `New booking – ${profile?.full_name ?? "A student"}`,
    html: `<p><strong>${profile?.full_name ?? "A student"}</strong> (${profile?.email}) just booked <strong>${cls.title}</strong> on ${classDate} using their pass.</p>`,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
