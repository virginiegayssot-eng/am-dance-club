import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { stripe, formatTime } from "@/lib/stripe";

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

  const { data: requester } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (requester?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId, studentId, amountCents } = await req.json();
  if (!classId || !studentId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = adminClient();

  const { data: cls } = await admin.from("classes").select("*").eq("id", classId).single();
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (cls.is_cancelled) return NextResponse.json({ error: "This class is cancelled" }, { status: 400 });

  const { data: regCount } = await admin.from("class_registration_counts").select("registered_count").eq("class_id", classId).single();
  if ((regCount?.registered_count ?? 0) >= cls.capacity) return NextResponse.json({ error: "Class is full" }, { status: 400 });

  const { data: existing } = await admin.from("registrations").select("id")
    .eq("class_id", classId).eq("student_id", studentId).not("status", "eq", "cancelled").single();
  if (existing) return NextResponse.json({ error: "Member is already booked for this class" }, { status: 400 });

  const { data: student } = await admin.from("profiles").select("email, full_name").eq("id", studentId).single();
  if (!student) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const finalAmount = amountCents ?? cls.price_cents;
  if (!finalAmount || finalAmount <= 0) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });

  const classDate = new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Reuses the same metadata shape the self-serve casual-booking checkout
  // uses (passTypeId: "casual" + studentId + classId) so the existing
  // webhook handles confirmation, the booking email, and recording the
  // payment identically — nothing new to maintain there. The only
  // difference is this session is created by the instructor on the
  // member's behalf, so there's no login requirement on her end at all.
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: cls.title,
            description: `${classDate} · ${formatTime(cls.class_time)} · ${cls.location}`,
          },
          unit_amount: finalAmount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/classes?booked=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/classes`,
    customer_email: student.email,
    metadata: {
      passTypeId: "casual",
      studentId,
      classId,
    },
  });

  return NextResponse.json({ url: session.url });
}
