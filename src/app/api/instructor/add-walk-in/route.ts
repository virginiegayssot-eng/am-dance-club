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

  const { classId, name, passId, paymentType = "complimentary" } = await req.json();
  if (!classId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = adminClient();

  // Deduct pass if provided
  if (passId) {
    const { data: pass } = await admin.from("passes").select("*").eq("id", passId).single();
    if (!pass) return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    if (pass.classes_remaining < 1) return NextResponse.json({ error: "No credits left on this pass" }, { status: 400 });
    await admin.from("passes").update({ classes_remaining: pass.classes_remaining - 1 }).eq("id", pass.id);
  }

  const { error } = await admin.from("walk_ins").insert({
    class_id: classId,
    name,
    payment_type: passId ? "pass" : paymentType,
    pass_id: passId ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
