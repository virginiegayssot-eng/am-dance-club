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

  const { passId } = await req.json();
  if (!passId) return NextResponse.json({ error: "Missing passId" }, { status: 400 });

  const admin = adminClient();

  const { data: pass } = await admin.from("passes").select("id").eq("id", passId).single();
  if (!pass) return NextResponse.json({ error: "Pass not found" }, { status: 404 });

  // Registrations and walk-ins both reference passes via a foreign key, so
  // anything booked with this pass has to be detached before the pass row
  // can be deleted — cancelling (not deleting) registrations keeps the
  // class's own history intact.
  await admin
    .from("registrations")
    .update({ status: "cancelled", pass_id: null })
    .eq("pass_id", passId);

  await admin
    .from("walk_ins")
    .update({ pass_id: null })
    .eq("pass_id", passId);

  const { error } = await admin.from("passes").delete().eq("id", passId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
