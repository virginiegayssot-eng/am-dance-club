import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { pushAdminClient } from "@/lib/push-admin";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const admin = pushAdminClient();
  await admin.from("push_subscriptions").delete().eq("student_id", user.id).eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
