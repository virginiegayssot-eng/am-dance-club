import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

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

  const { rating, review_text } = await req.json();
  const ratingNum = parseInt(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: "Please choose a star rating." }, { status: 400 });
  }
  if (!review_text || !review_text.trim()) {
    return NextResponse.json({ error: "Please write a few words for your review." }, { status: 400 });
  }

  const admin = adminClient();

  const { data: attended } = await admin
    .from("attendance")
    .select("id")
    .eq("student_id", user.id)
    .eq("attended", true)
    .limit(1);
  if (!attended || attended.length === 0) {
    return NextResponse.json({ error: "You can leave a review after attending your first class." }, { status: 403 });
  }

  const { data: prof } = await admin.from("profiles").select("full_name, email").eq("id", user.id).single();
  const author_name = prof?.full_name ?? prof?.email ?? "Member";

  const { data: existing } = await admin.from("reviews").select("id").eq("student_id", user.id).maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("reviews")
      .update({ rating: ratingNum, review_text: review_text.trim(), author_name, status: "pending" })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await admin
      .from("reviews")
      .insert({ student_id: user.id, rating: ratingNum, review_text: review_text.trim(), author_name, status: "pending" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
