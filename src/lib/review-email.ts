export function buildReviewEmailHtml(firstName: string) {
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
          <h2 style="color:#2041d8;font-size:22px;margin:0 0 16px;">Hey ${firstName}! 👋</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            So happy you joined us this morning for your first class at THE A.M Dance Club!
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
            If you enjoyed it, we'd love it if you could take 30 seconds to leave us a Google review — it means the world to us and helps other dancers find us! 🙏
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.GOOGLE_REVIEW_URL}" style="background:#2041d8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
              Leave a Review ⭐
            </a>
          </div>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">See you next Friday! 💃</p>
          <p style="color:#444;font-size:16px;margin:0;">Ginny &amp; THE A.M Dance Club team</p>
        </div>
        <div style="background:#e4c3cc;padding:20px;text-align:center;">
          <p style="color:#2041d8;font-size:12px;margin:0;">Every Friday · 7:00 AM · North Steyne Surf Club, Manly NSW</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
