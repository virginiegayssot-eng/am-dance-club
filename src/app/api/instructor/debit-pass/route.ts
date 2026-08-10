import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { buildPassDebitEmailHtml } from "@/lib/pass-debit-email";
import { Resend } from "resend";

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

  const { data: pass } = await admin
    .from("passes")
    .select("*, pass_types(*), profiles(full_name, email)")
    .eq("id", passId)
    .single();
  if (!pass) return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  if (pass.classes_remaining <= 0) return NextResponse.json({ error: "No classes remaining" }, { status: 400 });

  const newRemaining = pass.classes_remaining - 1;

  const { error } = await admin
    .from("passes")
    .update({ classes_remaining: newRemaining })
    .eq("id", passId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email student
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const student = (pass as any).profiles;
    const passType = (pass as any).pass_types;
    await resend.emails.send({
      from: `[Studio Name] <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
      to: student.email,
      subject: "Class recorded",
      html: buildPassDebitEmailHtml({
        firstName: student.full_name?.split(" ")[0] ?? "dancer",
        passName: passType?.name ?? "pass",
        classesRemaining: newRemaining,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
