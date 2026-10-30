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
  if (requester?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, base64 } = await req.json();
  if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
  if (!base64) return NextResponse.json({ error: "No image data" }, { status: 400 });

  const admin = adminClient();

  const { data: target } = await admin.from("profiles").select("avatar_url").eq("id", studentId).single();
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  // Give every upload its own filename — reusing the same path let Supabase's
  // storage CDN keep serving the old cached photo after a re-upload.
  const path = `${studentId}-${Date.now()}.jpg`;

  const { error } = await admin.storage.from("avatars").upload(path, buffer, { contentType: "image/jpeg" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(path);

  const oldPath = target.avatar_url?.match(/\/avatars\/(.+)$/)?.[1];
  if (oldPath) await admin.storage.from("avatars").remove([oldPath]);

  await admin.from("profiles").update({ avatar_url: publicUrl }).eq("id", studentId);

  return NextResponse.json({ url: publicUrl });
}
