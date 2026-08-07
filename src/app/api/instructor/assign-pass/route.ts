import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function buildBirthdayPassEmailHtml(firstName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#2041d8;padding:32px;text-align:center;">
          <h1 style="color:#e4c3cc;font-size:28px;margin:0;letter-spacing:2px;">THE A.M</h1>
          <p style="color:#ffffff;margin:4px 0 0;font-size:14px;letter-spacing:1px;">DANCE CLUB</p>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#2041d8;font-size:22px;margin:0 0 16px;">Happy Birthday, ${firstName}! 🎂</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            To celebrate your birthday, I've added a <strong>free class</strong> to your account.
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            It's valid for the next 30 days, so grab a spot whenever suits you.
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">See you on the dancefloor!</p>
          <p style="color:#444;font-size:16px;margin:0;">Ginny</p>
        </div>
        <div style="background:#e4c3cc;padding:20px;text-align:center;">
          <p style="color:#2041d8;font-size:12px;margin:0;">Every Friday · 7:00 AM · North Steyne Surf Club, Manly NSW</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildPassAssignedEmailHtml(firstName: string, passName: string, classesIncluded: number | null, expiresAt: string | null) {
  const expiryLine = expiresAt
    ? `Valid until ${new Date(expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.`
    : "No expiry.";
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#2041d8;padding:32px;text-align:center;">
          <h1 style="color:#e4c3cc;font-size:28px;margin:0;letter-spacing:2px;">THE A.M</h1>
          <p style="color:#ffffff;margin:4px 0 0;font-size:14px;letter-spacing:1px;">DANCE CLUB</p>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#2041d8;font-size:22px;margin:0 0 16px;">You're all set, ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            Your <strong>${passName}</strong>${classesIncluded ? ` (${classesIncluded} class${classesIncluded !== 1 ? "es" : ""})` : ""} has been added to your account and is ready to use.
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">${expiryLine}</p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">Head to the Classes page any time to book a spot.</p>
          <p style="color:#444;font-size:16px;margin:0;">See you on the dancefloor!</p>
        </div>
        <div style="background:#e4c3cc;padding:20px;text-align:center;">
          <p style="color:#2041d8;font-size:12px;margin:0;">Every Friday · 7:00 AM · North Steyne Surf Club, Manly NSW</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

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

  const { studentId, passTypeId, source, amountPaidCents } = await req.json();
  if (!studentId || !passTypeId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = adminClient();

  const { data: passType, error: passTypeError } = await admin.from("pass_types").select("*").eq("id", passTypeId).single();
  if (passTypeError) return NextResponse.json({ error: `DEBUG pass_types lookup error for id "${passTypeId}": ${passTypeError.message} (code: ${passTypeError.code})` }, { status: 400 });
  if (!passType) return NextResponse.json({ error: `DEBUG no pass_type row for id "${passTypeId}"` }, { status: 404 });

  const expiresAt = passType.validity_days
    ? new Date(Date.now() + passType.validity_days * 86400000).toISOString()
    : null;

  const { error } = await admin.from("passes").insert({
    student_id: studentId,
    pass_type_id: passTypeId,
    classes_total: passType.classes_included ?? 1,
    classes_remaining: passType.classes_included ?? 1,
    expires_at: expiresAt,
    stripe_session_id: null,
    source: source ?? "cash",
    amount_paid_cents: amountPaidCents ?? passType.price_cents,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: student } = await admin.from("profiles").select("full_name, email").eq("id", studentId).single();
  if (student?.email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const firstName = (student.full_name ?? "dancer").split(" ")[0];

    if (passTypeId === "birthday") {
      await resend.emails.send({
        from: `THE A.M Dance Club <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: student.email,
        subject: "Happy Birthday from THE A.M Dance Club! 🎂",
        html: buildBirthdayPassEmailHtml(firstName),
      }).catch((e) => console.error("Birthday pass email error:", e));
    } else {
      await resend.emails.send({
        from: `THE A.M Dance Club <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: student.email,
        subject: `Your ${passType.name} is ready — THE A.M Dance Club`,
        html: buildPassAssignedEmailHtml(firstName, passType.name, passType.classes_included, expiresAt),
      }).catch((e) => console.error("Pass assigned email error:", e));
    }
  }

  return NextResponse.json({ success: true });
}
