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

  const { students } = await req.json();
  if (!students || !Array.isArray(students)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const admin = adminClient();
  const { data: existingList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingEmails = new Set(existingList?.users?.map(u => u.email?.toLowerCase()) ?? []);

  const results: { email: string; name: string; status: "invited" | "skipped" | "error"; reason?: string }[] = [];

  for (const student of students) {
    const { full_name, email, phone } = student;
    if (!email || !full_name) {
      results.push({ email: email ?? "?", name: full_name ?? "?", status: "error", reason: "Missing name or email" });
      continue;
    }

    if (existingEmails.has(email.toLowerCase())) {
      results.push({ email, name: full_name, status: "skipped", reason: "Already has an account" });
      continue;
    }

    try {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name, phone: phone || null },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      });

      if (inviteError) {
        results.push({ email, name: full_name, status: "error", reason: inviteError.message });
        continue;
      }

      await admin.from("profiles").upsert({
        id: invited.user.id,
        email,
        full_name,
        phone: phone || null,
        role: "student",
      });

      results.push({ email, name: full_name, status: "invited" });
    } catch (err: any) {
      results.push({ email, name: full_name, status: "error", reason: err.message });
    }
  }

  return NextResponse.json({ results });
}
