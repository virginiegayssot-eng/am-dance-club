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

  const { walkInId } = await req.json();
  if (!walkInId) return NextResponse.json({ error: "Missing walkInId" }, { status: 400 });

  const admin = adminClient();

  const { data: walkIn } = await admin.from("walk_ins").select("id, pass_id").eq("id", walkInId).single();
  if (!walkIn) return NextResponse.json({ error: "Walk-in not found" }, { status: 404 });

  // If a pass was deducted for this walk-in, give the credit back before
  // removing the row — otherwise deleting a mistaken entry would leave the
  // member permanently down a class they never actually used.
  if (walkIn.pass_id) {
    const { data: pass } = await admin.from("passes").select("classes_remaining").eq("id", walkIn.pass_id).single();
    if (pass) {
      const { error: refundError } = await admin
        .from("passes")
        .update({ classes_remaining: pass.classes_remaining + 1 })
        .eq("id", walkIn.pass_id);
      if (refundError) return NextResponse.json({ error: "Could not refund the pass credit — please try again." }, { status: 500 });
    }
  }

  const { error } = await admin.from("walk_ins").delete().eq("id", walkInId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
