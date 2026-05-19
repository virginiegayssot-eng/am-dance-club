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

  const { full_name, email, phone } = await req.json();
  if (!email || !full_name) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });

  const admin = adminClient();

  // Check if user already exists
  const { data: existingList } = await admin.auth.admin.listUsers();
  const existing = existingList?.users?.find(u => u.email === email);
  if (existing) return NextResponse.json({ error: "A student with this email already exists" }, { status: 400 });

  // Invite the student — they'll get an email to set their password
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, phone: phone || null },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });

  // Upsert profile
  await admin.from("profiles").upsert({
    id: invited.user.id,
    email,
    full_name,
    phone: phone || null,
    role: "student",
  });

  return NextResponse.json({ success: true, userId: invited.user.id });
}
