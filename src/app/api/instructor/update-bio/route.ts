import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function adminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profileId, title, bio } = await req.json();
  if (!profileId) return NextResponse.json({ error: "Missing profileId" }, { status: 400 });

  const admin = adminClient();

  const { data: requester } = await admin.from("profiles").select("role, is_admin").eq("id", user.id).single();
  if (requester?.role !== "instructor") {
    return NextResponse.json({ error: "Only instructors can edit instructor bios" }, { status: 403 });
  }
  if (!requester.is_admin && profileId !== user.id) {
    return NextResponse.json({ error: "You can only edit your own bio" }, { status: 403 });
  }

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
