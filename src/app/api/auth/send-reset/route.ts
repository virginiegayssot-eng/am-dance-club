import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password` },
  });

  if (error || !data?.properties?.hashed_token) {
    return NextResponse.json({ error: error?.message ?? "Failed to generate link" }, { status: 500 });
  }

  const { hashed_token } = data.properties;
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token_hash=${hashed_token}&type=recovery`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
    to: email,
    subject: "Reset your password — Sable Studio",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#fbf8f4;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
          <div style="background:#7d6653;padding:32px;text-align:center;">
            <h1 style="color:#f0e8dd;font-size:28px;margin:0;letter-spacing:2px;">Sable Studio</h1>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="color:#7d6653;font-size:22px;margin:0 0 16px;">Reset your password</h2>
            <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
              Hi,<br/><br/>
              Click the button below to set a new password for your account. This link expires in 1 hour.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="background:#7d6653;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
                Set New Password
              </a>
            </div>
            <p style="color:#888;font-size:13px;line-height:1.5;margin:0;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <div style="background:#f0e8dd;padding:20px;text-align:center;">
            <p style="color:#7d6653;font-size:12px;margin:0;">Weekly classes · Sydney, NSW</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (emailError) return NextResponse.json({ error: emailError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
