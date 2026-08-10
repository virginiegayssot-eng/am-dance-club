export function buildBookingConfirmationEmailHtml({
  firstName,
  classTitle,
  classDate,
  guestCount,
}: {
  firstName: string;
  classTitle: string;
  classDate: string;
  guestCount: number;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#000000;padding:32px;text-align:center;">
          <h1 style="color:#e2d0fb;font-size:28px;margin:0;letter-spacing:2px;">BYLA</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#000000;font-size:22px;margin:0 0 16px;">You're booked, ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">
            <strong>${classTitle}</strong>
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            ${classDate}
            ${guestCount > 0 ? `<br>Plus ${guestCount} guest${guestCount !== 1 ? "s" : ""}` : ""}
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">See you there!</p>
          <p style="text-align:center;margin:0 0 28px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/classes" style="background:#000000;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">Manage My Booking</a>
          </p>
          <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 16px;border-top:1px solid #eee;padding-top:16px;">
            Need to cancel? You can do it any time from the app, free up to 24 hours before class. Cancellations within 24 hours can't be refunded.
          </p>
          <p style="color:#444;font-size:16px;margin:0;">Majo</p>
        </div>
        <div style="background:#e2d0fb;padding:20px;text-align:center;">
          <p style="color:#000000;font-size:12px;margin:0;">BYLA Alexandria & BYLA Manly, Sydney</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
