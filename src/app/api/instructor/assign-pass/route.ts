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

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, passTypeId, source, amountPaidCents } = await req.json();
  if (!studentId || !passTypeId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = adminClient();

  const { data: passType } = await admin.from("pass_types").select("*").eq("id", passTypeId).single();
  if (!passType) return NextResponse.json({ error: "Pass type not found" }, { status: 404 });

  const expiresAt = passType.validity_days
    ? new Date(Date.now() + passType.validity_days * 86400000).toISOString()
    : null;

  const { error } = await admin.from("passes").insert({
    student_id: studentId,
    pass_type_id: passTypeId,
    classes_total: passType.classes_included ?? 1,
    classes_remaining: passType.classes_included ?? 1,
    expires_at: expiresAt,
    stripe_session_id: null,
    source: source ?? "cash",
    amount_paid_cents: amountPaidCents ?? passType.price_cents,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
