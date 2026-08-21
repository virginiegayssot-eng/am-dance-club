import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { buildBookingCancellationEmailHtml } from "@/lib/booking-cancellation-email";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Instructor cancels an entire upcoming class (e.g. sick day) rather than a
// single member's booking. Every still-active registration gets its pass
// credit refunded and the member gets an email, same as a self-cancellation,
// but framed as the studio cancelling rather than the member.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 });

  const admin = adminClient();

  const { data: cls } = await admin.from("classes").select("title, class_date").eq("id", classId).single();
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  // Mark the class cancelled first — this is the source-of-truth action;
  // refunding/notifying members below must never block it from taking effect.
  await admin.from("classes").update({ is_cancelled: true }).eq("id", classId);

  const { data: regs } = await admin
    .from("registrations")
    .select("id, pass_id, guest_count, profiles(full_name, email)")
    .eq("class_id", classId)
    .not("status", "eq", "cancelled");

  let notifiedCount = 0;
  let refundedCount = 0;

  const classDate = new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const resend = new Resend(process.env.RESEND_API_KEY);

  for (const reg of regs ?? []) {
    const r = reg as any;

    await admin.from("registrations").update({ status: "cancelled" }).eq("id", r.id);

    let passRefunded = false;
    if (r.pass_id) {
      const { data: pass } = await admin.from("passes").select("classes_remaining, pass_types(*)").eq("id", r.pass_id).single();
      if (pass) {
        const maxGuests = (pass as any).pass_types?.max_guests ?? 0;
        const creditsToRefund = 1 + Math.max(0, (r.guest_count ?? 0) - maxGuests);
        await admin.from("passes").update({ classes_remaining: pass.classes_remaining + creditsToRefund }).eq("id", r.pass_id);
        passRefunded = true;
        refundedCount++;
      }
    }

    const student = r.profiles;
    if (!student?.email) continue;

    const firstName = (student.full_name ?? "dancer").split(" ")[0];
    const { error } = await resend.emails.send({
      from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
      to: student.email,
      subject: `Class cancelled – ${cls.title}`,
      html: buildBookingCancellationEmailHtml({ firstName, classTitle: cls.title, classDate, passRefunded, cancelledByInstructor: true }),
    }).catch((e) => ({ error: e }));

    if (error) {
      console.error(`Class-cancellation email failed for ${student.email}:`, error);
    } else {
      notifiedCount++;
    }
  }

  return NextResponse.json({ cancelled: true, notifiedCount, refundedCount });
}
