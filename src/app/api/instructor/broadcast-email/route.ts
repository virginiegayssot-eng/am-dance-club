import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentIds, subject, message } = await req.json();
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: "Missing studentIds" }, { status: 400 });
  }
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
  }

  const { data: recipients } = await supabase
    .from("profiles")
    .select("full_name, email")
    .in("id", studentIds);

  let sent = 0;
  const errors: string[] = [];

  for (const profile of recipients ?? []) {
    if (!profile.email) continue;
    const firstName = (profile.full_name ?? "there").split(" ")[0];
    const bodyHtml = String(message).trim().split("\n").map((line: string) => `<p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">${line}</p>`).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
          <div style="background:#2041d8;padding:32px;text-align:center;">
            <h1 style="color:#e4c3cc;font-size:28px;margin:0;letter-spacing:2px;">THE A.M</h1>
            <p style="color:#ffffff;margin:4px 0 0;font-size:14px;letter-spacing:1px;">DANCE CLUB</p>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="color:#2041d8;font-size:22px;margin:0 0 16px;">Hi ${firstName},</h2>
            ${bodyHtml}
            <p style="color:#444;font-size:16px;margin:24px 0 0;">Ginny</p>
          </div>
          <div style="background:#e4c3cc;padding:20px;text-align:center;">
            <p style="color:#2041d8;font-size:12px;margin:0;">Every Friday · 7:00 AM · North Steyne Surf Club, Manly NSW</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: `THE A.M Dance Club <${process.env.RESEND_FROM}>`,
      to: profile.email,
      subject: String(subject).trim(),
      html,
    }).catch((e) => ({ error: e }));

    if (error) errors.push(`${profile.email}: ${error.message ?? error}`);
    else sent++;
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
