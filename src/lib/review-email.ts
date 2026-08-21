export function buildReviewEmailHtml(firstName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#221f1c;padding:32px;text-align:center;">
          <h1 style="color:#f4efe6;font-size:28px;margin:0;letter-spacing:2px;">Sable Studio</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#221f1c;font-size:22px;margin:0 0 16px;">Hey ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            So happy you joined us for your first class at Sable Studio!
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
            If you enjoyed it, I'd love it if you could take 30 seconds to leave me a Google review. It means the world to me and helps other dancers find me!
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.GOOGLE_REVIEW_URL}" style="background:#221f1c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
              Leave a Review
            </a>
          </div>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">See you next Friday!</p>
          <p style="color:#444;font-size:16px;margin:0;">— The Sable Studio Team</p>
        </div>
        <div style="background:#f4efe6;padding:20px;text-align:center;">
          <p style="color:#221f1c;font-size:12px;margin:0;">Weekly classes · Sydney, NSW</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildGenericReviewEmailHtml(firstName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#221f1c;padding:32px;text-align:center;">
          <h1 style="color:#f4efe6;font-size:28px;margin:0;letter-spacing:2px;">Sable Studio</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#221f1c;font-size:22px;margin:0 0 16px;">Hey ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            I love having you as part of Sable Studio family!
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
            If you've been enjoying our Friday classes, I'd love it if you could take 30 seconds to leave me a Google review. It means the world to me and helps other dancers find me!
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.GOOGLE_REVIEW_URL}" style="background:#221f1c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
              Leave a Review
            </a>
          </div>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">See you next Friday!</p>
          <p style="color:#444;font-size:16px;margin:0;">— The Sable Studio Team</p>
        </div>
        <div style="background:#f4efe6;padding:20px;text-align:center;">
          <p style="color:#221f1c;font-size:12px;margin:0;">Weekly classes · Sydney, NSW</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
