import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { buildReviewEmailHtml, buildGenericReviewEmailHtml } from "@/lib/review-email";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId, studentIds, generic } = await req.json();
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: "Missing studentIds" }, { status: 400 });
  }
  if (!generic && !classId) {
    return NextResponse.json({ error: "Missing classId" }, { status: 400 });
  }

  let recipients: { email: string; full_name: string | null }[];

  if (generic) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("full_name, email")
      .in("id", studentIds);
    recipients = profiles ?? [];
  } else {
    const { data: attended } = await supabase
      .from("attendance")
      .select("student_id, profiles(full_name, email)")
      .eq("class_id", classId)
      .eq("attended", true)
      .in("student_id", studentIds);
    recipients = (attended ?? []).map(record => record.profiles as any);
  }

  let sent = 0;
  const errors: string[] = [];

  for (const profile of recipients) {
    const email = profile?.email;
    if (!email) continue;

    const firstName = (profile?.full_name ?? "dancer").split(" ")[0];

    const { error } = await resend.emails.send({
      from: `THE A.M Dance Club <${process.env.RESEND_FROM}>`,
      to: email,
      subject: generic ? "Loving THE A.M Dance Club?" : "How was your first class?",
      html: generic ? buildGenericReviewEmailHtml(firstName) : buildReviewEmailHtml(firstName),
    });

    if (error) {
      errors.push(`${email}: ${error.message}`);
      continue;
    }
    sent++;
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
