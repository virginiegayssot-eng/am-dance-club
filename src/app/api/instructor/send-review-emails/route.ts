import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { buildReviewEmailHtml } from "@/lib/review-email";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId, studentIds } = await req.json();
  if (!classId || !Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: "Missing classId or studentIds" }, { status: 400 });
  }

  const { data: attended } = await supabase
    .from("attendance")
    .select("student_id, profiles(full_name, email)")
    .eq("class_id", classId)
    .eq("attended", true)
    .in("student_id", studentIds);

  if (!attended || attended.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const errors: string[] = [];

  for (const record of attended) {
    const profile = record.profiles as any;
    const email = profile?.email;
    if (!email) continue;

    const firstName = (profile?.full_name ?? "dancer").split(" ")[0];

    const { error } = await resend.emails.send({
      from: `THE A.M Dance Club <${process.env.RESEND_FROM}>`,
      to: email,
      subject: "How was your first class? 🎵",
      html: buildReviewEmailHtml(firstName),
    });

    if (error) {
      errors.push(`${email}: ${error.message}`);
      continue;
    }
    sent++;
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
