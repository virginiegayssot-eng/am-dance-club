import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// BYLA only offers these three tiers — no double/intro pass.
const PASS_CONFIGS: Record<string, { name: string; price: number; classes: number; validityDays: number | null; newOnly: boolean }> = {
  casual:  { name: "Casual Class",   price: 2600,  classes: 1,  validityDays: null, newOnly: false },
  five:    { name: "5-Class Pack",   price: 12000, classes: 5,  validityDays: 90,   newOnly: false },
  ten:     { name: "10-Class Pack",  price: 22000, classes: 10, validityDays: 180,  newOnly: false },
};

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { passTypeId, classId, discountCode, useAltDuration } = await req.json();
  const config = PASS_CONFIGS[passTypeId];
  if (!config) return NextResponse.json({ error: "Invalid pass type" }, { status: 400 });

  // Validate new-student-only passes
  if (config.newOnly) {
    const { data: existingRegs } = await supabase
      .from("registrations")
      .select("id")
      .eq("student_id", user.id)
      .eq("status", "confirmed")
      .limit(1);
    if (existingRegs && existingRegs.length > 0) {
      return NextResponse.json({ error: "Intro Pass is for new students only" }, { status: 400 });
    }
  }

  // Casual bookings charge the specific class's own price (and optional alt-duration price),
  // not the flat PASS_CONFIGS.casual price
  let basePrice = config.price;
  let classDurationMinutes: number | null = null;
  if (passTypeId === "casual" && classId) {
    const { data: cls } = await supabase.from("classes").select("price_cents, duration_minutes, alt_price_cents, alt_duration_minutes").eq("id", classId).single();
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    if (useAltDuration) {
      if (!cls.alt_price_cents || !cls.alt_duration_minutes) {
        return NextResponse.json({ error: "This class has no alternate duration option" }, { status: 400 });
      }
      basePrice = cls.alt_price_cents;
      classDurationMinutes = cls.alt_duration_minutes;
    } else {
      basePrice = cls.price_cents;
      classDurationMinutes = cls.duration_minutes;
    }
  }

  // Apply discount code if provided
  let finalPrice = basePrice;
  let discountId: string | null = null;

  if (discountCode) {
    const admin = adminClient();
    const { data: discount } = await admin
      .from("discount_codes")
      .select("*")
      .eq("code", discountCode.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (discount &&
      (!discount.expires_at || new Date(discount.expires_at) > new Date()) &&
      (discount.max_uses === null || discount.uses_count < discount.max_uses)
    ) {
      discountId = discount.id;
      if (discount.discount_type === "percentage") {
        finalPrice = Math.round(basePrice * (1 - discount.discount_value / 100));
      } else {
        finalPrice = Math.max(0, basePrice - discount.discount_value);
      }
    }
  }

  const descriptions: Record<string, string> = {
    casual: classDurationMinutes ? `Single drop-in class · ${classDurationMinutes} min` : "Single drop-in class",
    five:   "5 classes · Valid 2 months",
    ten:    "10 classes · Valid 1 year",
  };

  const successUrl = classId
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&classId=${classId}&passType=${passTypeId}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?passSuccess=true&passType=${passTypeId}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "aud",
        product_data: {
          name: config.name,
          description: descriptions[passTypeId],
        },
        unit_amount: finalPrice,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: successUrl,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/passes`,
    customer_email: user.email,
    metadata: {
      passTypeId,
      studentId: user.id,
      classId: classId ?? "",
      isDoublePass: passTypeId === "double" ? "true" : "false",
      discountId: discountId ?? "",
    },
  });

  return NextResponse.json({ url: session.url });
}
