import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToStudents } from "@/lib/push-admin";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentIds, title, body, url } = await req.json();
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: "Missing studentIds" }, { status: 400 });
  }
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
  }

  const admin = adminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("student_id")
    .in("student_id", studentIds);
  const subscribedIds = new Set((subs ?? []).map(s => s.student_id));

  await sendPushToStudents(studentIds, {
    title: String(title).trim(),
    body: String(body).trim(),
    url: url?.trim() || "/classes",
  });

  const { data: recipients } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", studentIds);

  const { data: broadcast } = await supabase
    .from("broadcast_sends")
    .insert({
      sent_by: user.id,
      channel: "push",
      subject: String(title).trim(),
      message: String(body).trim(),
      recipient_count: studentIds.length,
      sent_count: subscribedIds.size,
      failed_count: studentIds.length - subscribedIds.size,
    })
    .select("id")
    .single();

  if (broadcast?.id && recipients) {
    const logRows = recipients.map(r => ({
      broadcast_id: broadcast.id,
      student_id: r.id,
      email: r.email,
      full_name: r.full_name,
      status: subscribedIds.has(r.id) ? "sent" as const : "failed" as const,
      error: subscribedIds.has(r.id) ? null : "No push subscription (notifications not enabled)",
    }));
    await supabase.from("broadcast_recipients").insert(logRows);
  }

  return NextResponse.json({ sent: subscribedIds.size });
}
