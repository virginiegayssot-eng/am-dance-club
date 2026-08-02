import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId, size } = await req.json();

  const { data: product } = await supabase
    .from("merch_products")
    .select("*")
    .eq("id", productId)
    .eq("active", true)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.sizes && product.sizes.length > 0 && !size) {
    return NextResponse.json({ error: "Please select a size" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "aud",
          product_data: {
            name: product.title + (size ? ` (${size})` : ""),
            description: product.description ?? undefined,
          },
          unit_amount: product.price_cents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/merch?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/merch`,
    customer_email: user.email,
    metadata: {
      type: "merch",
      productId,
      studentId: user.id,
      size: size ?? "",
    },
  });

  await supabase.from("merch_orders").insert({
    product_id: productId,
    student_id: user.id,
    size: size ?? null,
    status: "pending",
    stripe_session_id: session.id,
  });

  return NextResponse.json({ url: session.url });
}
