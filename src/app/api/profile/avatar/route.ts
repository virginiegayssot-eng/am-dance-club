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

  const { base64 } = await req.json();
  if (!base64) return NextResponse.json({ error: "No image data" }, { status: 400 });

  const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  // Give every upload its own filename — reusing the same path let Supabase's
  // storage CDN keep serving the old cached photo after a re-upload.
  const path = `${user.id}-${Date.now()}.jpg`;

  const admin = adminClient();
  const { error } = await admin.storage
    .from("avatars")
    .upload(path, buffer, { contentType: "image/jpeg" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(path);

  // Best-effort cleanup of the previous photo so old uploads don't pile up.
  const { data: prof } = await admin.from("profiles").select("avatar_url").eq("id", user.id).single();
  const oldPath = prof?.avatar_url?.match(/\/avatars\/(.+)$/)?.[1];
  if (oldPath) await admin.storage.from("avatars").remove([oldPath]);

  await admin.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);

  return NextResponse.json({ url: publicUrl });
}
