import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendPushToAll } from "@/lib/push-admin";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, title, body } = await req.json();
  if (!["chat", "video", "news"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (type === "video" || type === "news") {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (type === "chat") {
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    const senderName = prof?.full_name?.split(" ")[0] ?? "Someone";
    await sendPushToAll(
      { title: `${senderName} in the group chat`, body: String(body ?? "").slice(0, 140), url: "/chat" },
      user.id
    );
  } else if (type === "video") {
    await sendPushToAll({ title: "New video uploaded", body: String(title ?? "").slice(0, 140), url: "/videos" });
  } else {
    await sendPushToAll({ title: "New club news", body: String(title ?? "").slice(0, 140), url: "/dashboard" });
  }

  return NextResponse.json({ ok: true });
}
