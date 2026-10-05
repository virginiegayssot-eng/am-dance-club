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

  const { data: requester } = await supabase.from("profiles").select("role, is_admin").eq("id", user.id).single();
  if (requester?.role !== "instructor") {
    return NextResponse.json({ error: "Only instructors can edit instructor bios" }, { status: 403 });
  }

  const { profileId, title, bio, show_on_instructors_page } = await req.json();
  if (!profileId) return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
  if (!requester.is_admin && profileId !== user.id) {
    return NextResponse.json({ error: "You can only edit your own bio" }, { status: 403 });
  }

  const admin = adminClient();

  const { data: target } = await admin.from("profiles").select("role").eq("id", profileId).single();
  if (target?.role !== "instructor") {
    return NextResponse.json({ error: "Target is not an instructor" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title || null;
  if (bio !== undefined) updates.bio = bio || null;
  if (show_on_instructors_page !== undefined) updates.show_on_instructors_page = !!show_on_instructors_page;

  const { error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
