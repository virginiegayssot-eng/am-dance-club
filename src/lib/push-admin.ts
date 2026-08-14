import { createClient as createSupabase } from "@supabase/supabase-js";
import webpush from "web-push";

export function pushAdminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function sendPushToAll(
  payload: { title: string; body: string; url: string },
  excludeStudentId?: string
) {
  webpush.setVapidDetails(
    "mailto:hello@byla.fit",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const admin = pushAdminClient();
  let query = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (excludeStudentId) query = query.neq("student_id", excludeStudentId);
  const { data: subs } = await query;
  if (!subs || subs.length === 0) return;

  const json = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}
