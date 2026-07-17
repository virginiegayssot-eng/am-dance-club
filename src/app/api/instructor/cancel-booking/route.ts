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

  const { regId, passId, guestCount = 0 } = await req.json();
  if (!regId) return NextResponse.json({ error: "Missing regId" }, { status: 400 });

  const admin = adminClient();

  // Cancel the registration
  await admin.from("registrations").update({ status: "cancelled" }).eq("id", regId);

  // Refund pass credits if applicable
  if (passId) {
    const { data: pass } = await admin.from("passes").select("classes_remaining, pass_types(*)").eq("id", passId).single();
    if (pass) {
      const maxGuests = (pass as any).pass_types?.max_guests ?? 0;
      const creditsToRefund = 1 + Math.max(0, guestCount - maxGuests);
      await admin.from("passes").update({ classes_remaining: pass.classes_remaining + creditsToRefund }).eq("id", passId);
    }
  }

  return NextResponse.json({ success: true });
}
