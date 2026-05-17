import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
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

  // Create registration and deduct pass credit
  const { error: regError } = await supabase.from("registrations").insert({
    class_id: classId,
    student_id: user.id,
    status: "confirmed",
    pass_id: passId,
    payment_type: "pass",
    guest_count: 0,
  });

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });

  await supabase
    .from("passes")
    .update({ classes_remaining: pass.classes_remaining - 1 })
    .eq("id", passId);

  return NextResponse.json({ success: true });
}
