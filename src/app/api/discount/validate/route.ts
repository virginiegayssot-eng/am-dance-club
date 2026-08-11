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

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

  const admin = adminClient();
  const { data: discount } = await admin
    .from("discount_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("active", true)
    .single();

  if (!discount) return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
  if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
    return NextResponse.json({ error: "This code has expired" }, { status: 400 });
  }
  if (discount.max_uses !== null && discount.uses_count >= discount.max_uses) {
    return NextResponse.json({ error: "This code has reached its usage limit" }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    id: discount.id,
    discount_type: discount.discount_type,
    discount_value: discount.discount_value,
    applicable_pass_type: discount.applicable_pass_type,
  });
}
