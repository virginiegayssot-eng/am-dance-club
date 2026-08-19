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

  const { data: requester } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (requester?.role !== "instructor") {
    return NextResponse.json({ error: "Only instructors can edit instructor bios" }, { status: 403 });
  }

  const { profileId, title, bio } = await req.json();
  if (!profileId) return NextResponse.json({ error: "Missing profileId" }, { status: 400 });

  const admin = adminClient();

  const { data: target } = await admin.from("profiles").select("role").eq("id", profileId).single();
  if (target?.role !== "instructor") {
    return NextResponse.json({ error: "Target is not an instructor" }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ title: title || null, bio: bio || null })
    .eq("id", profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
