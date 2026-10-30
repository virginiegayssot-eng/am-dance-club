import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { isValidPhone } from "@/lib/phone";

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

  const { data: requester } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (requester?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, full_name, phone, birth_date } = await req.json();
  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
  if (!full_name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!isValidPhone(phone ?? "")) return NextResponse.json({ error: "A valid phone number is required" }, { status: 400 });

  const admin = adminClient();

  const { data: target } = await admin.from("profiles").select("role").eq("id", studentId).single();
  if (!target || target.role !== "student") return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const { error } = await admin
    .from("profiles")
    .update({ full_name, phone, birth_date: birth_date || null })
    .eq("id", studentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
