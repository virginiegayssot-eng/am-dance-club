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
  const { count } = await admin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .in("student_id", studentIds);

  await sendPushToStudents(studentIds, {
    title: String(title).trim(),
    body: String(body).trim(),
    url: url?.trim() || "/classes",
  });

  return NextResponse.json({ sent: count ?? 0 });
}
