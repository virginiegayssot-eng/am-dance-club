import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { buildReviewEmailHtml, buildGenericReviewEmailHtml } from "@/lib/review-email";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId, generic } = await req.json();

  if (generic) {
    return NextResponse.json({ candidates: [], previewHtml: buildGenericReviewEmailHtml("there") });
  }

  if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 });

  const { data: attended } = await supabase
    .from("attendance")
    .select("student_id, profiles(full_name, email)")
    .eq("class_id", classId)
    .eq("attended", true);

  if (!attended || attended.length === 0) {
    return NextResponse.json({ candidates: [], previewHtml: buildReviewEmailHtml("there") });
  }

  const candidates: { id: string; full_name: string | null; email: string }[] = [];

  for (const record of attended) {
    const studentId = record.student_id;
    const profile = record.profiles as any;

    const { data: prevAttendance } = await supabase
      .from("attendance")
      .select("id")
      .eq("student_id", studentId)
      .eq("attended", true)
      .neq("class_id", classId)
      .limit(1);

    if (prevAttendance && prevAttendance.length > 0) continue;
    if (!profile?.email) continue;

    candidates.push({ id: studentId, full_name: profile.full_name ?? null, email: profile.email });
  }

  const previewName = candidates[0] ? (candidates[0].full_name ?? "there").split(" ")[0] : "there";

  return NextResponse.json({ candidates, previewHtml: buildReviewEmailHtml(previewName) });
}
