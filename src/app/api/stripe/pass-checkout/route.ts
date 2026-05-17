import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const PASS_CONFIGS: Record<string, { name: string; price: number; classes: number; validityDays: number | null; newOnly: boolean }> = {
  casual:  { name: "Casual Class",   price: 2400,  classes: 1,  validityDays: null, newOnly: false },
  double:  { name: "Double Pass",    price: 3800,  classes: 1,  validityDays: null, newOnly: false },
  intro:   { name: "Intro Pass",     price: 3900,  classes: 3,  validityDays: 90,   newOnly: true  },
  five:    { name: "5-Class Pass",   price: 10000, classes: 5,  validityDays: 180,  newOnly: false },
  ten:     { name: "10-Class Pass",  price: 20000, classes: 10, validityDays: 365,  newOnly: false },
};

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { passTypeId, classId } = await req.json();
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

  // For casual/double, classId is required
  if ((passTypeId === "casual" || passTypeId === "double") && !classId) {
    return NextResponse.json({ error: "Class ID required for casual/double" }, { status: 400 });
  }

  const descriptions: Record<string, string> = {
    casual: "Single drop-in class · North Steyne Surf Club",
    double: "Two spots in one class (bring a friend!)",
    intro:  "3 classes · Valid 3 months · New students only",
    five:   "5 classes · Valid 6 months",
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
        unit_amount: config.price,
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
    },
  });

  return NextResponse.json({ url: session.url });
}
