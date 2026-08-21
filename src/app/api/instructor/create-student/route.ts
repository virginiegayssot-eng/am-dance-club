import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
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
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { full_name, email, phone } = await req.json();
  if (!email || !full_name) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });

  const admin = adminClient();

  // Check if user already exists
  const { data: existingList } = await admin.auth.admin.listUsers();
  const existing = existingList?.users?.find(u => u.email === email);
  if (existing) return NextResponse.json({ error: "A student with this email already exists" }, { status: 400 });

  // Generate the invite link ourselves (instead of inviteUserByEmail, which
  // sends Supabase's own plain, unbranded email that's unreliable to deliver)
  // so we can send our own branded email via Resend instead — same pattern
  // as the password reset flow.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name, phone: phone || null },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    },
  });

  if (linkError || !linkData?.user || !linkData.properties?.hashed_token) {
    return NextResponse.json({ error: linkError?.message ?? "Failed to generate invite link" }, { status: 500 });
  }

  const invitedUserId = linkData.user.id;
  // Reuses the reset-password page's existing token_hash verify flow — the
  // type=invite param lets that page treat this as a first-time welcome
  // rather than a password reset.
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token_hash=${linkData.properties.hashed_token}&type=invite`;
  const firstName = full_name.split(" ")[0];

  // Upsert profile
  await admin.from("profiles").upsert({
    id: invitedUserId,
    email,
    full_name,
    phone: phone || null,
    role: "student",
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
    to: email,
    subject: "You're invited to Sable Studio!",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
          <div style="background:#7d6653;padding:32px;text-align:center;">
            <h1 style="color:#f0e8dd;font-size:28px;margin:0;letter-spacing:2px;">Sable Studio</h1>
          </div>
          <div style="padding:36px 32px;">
            <h2 style="color:#7d6653;font-size:22px;margin:0 0 16px;">Hey ${firstName}!</h2>
            <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
              I'd love to have you join us at Sable Studio!
            </p>
            <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
              Click below to set up your account. From there you can book classes, buy passes, and see what's coming up.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${inviteUrl}" style="background:#7d6653;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
                Set Up My Account
              </a>
            </div>
            <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">Can't wait to see you!</p>
            <p style="color:#444;font-size:16px;margin:0;">— The Sable Studio Team</p>
          </div>
          <div style="background:#f0e8dd;padding:20px;text-align:center;">
            <p style="color:#7d6653;font-size:12px;margin:0;">Weekly classes · Sydney, NSW</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (emailError) {
    // The account and profile already exist at this point — surface the raw
    // link so the instructor can share it manually rather than leaving the
    // student stuck with an account they were never told about.
    return NextResponse.json({
      success: true,
      userId: invitedUserId,
      emailSent: false,
      inviteUrl,
      warning: "Account created, but the invite email failed to send. Share this link with them directly.",
    });
  }

  return NextResponse.json({ success: true, userId: invitedUserId, emailSent: true });
}
