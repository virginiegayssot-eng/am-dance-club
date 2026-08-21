import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await req.json();

  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (!cls) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (cls.is_cancelled) {
    return NextResponse.json({ error: "Class is cancelled" }, { status: 400 });
  }

  // Check capacity
  const { data: regCount } = await supabase
    .from("class_registration_counts")
    .select("registered_count")
    .eq("class_id", classId)
    .single();

  if (regCount && regCount.registered_count >= cls.capacity) {
    return NextResponse.json({ error: "Class is full" }, { status: 400 });
  }

  // Check not already registered
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .eq("status", "confirmed")
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already registered" }, { status: 400 });
  }

  const classDate = new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: cls.title,
            description: `${classDate} · Sydney, NSW`,
          },
          unit_amount: cls.price_cents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&classId=${classId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/classes`,
    customer_email: user.email,
    metadata: {
      classId,
      studentId: user.id,
    },
  });

  // Create pending registration
  await supabase.from("registrations").upsert({
    class_id: classId,
    student_id: user.id,
    status: "pending",
    stripe_payment_intent_id: session.payment_intent as string,
  });

  return NextResponse.json({ url: session.url });
}
