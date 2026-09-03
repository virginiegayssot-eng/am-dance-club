export function buildBirthdayEmailHtml(firstName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#221f1c;padding:32px;text-align:center;">
          <h1 style="color:#f4efe6;font-size:28px;margin:0;letter-spacing:2px;">Sable Studio</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#221f1c;font-size:22px;margin:0 0 16px;">Happy Birthday, ${firstName}! 🎂</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            Happy birthday! 🎉 Hope you have a wonderful day.
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Thank you for being part of Sable Studio. We love having you in class.
          </p>
          <p style="color:#444;font-size:16px;margin:0;">See you on the dance floor soon!</p>
          <p style="color:#444;font-size:16px;margin:0;">— The Sable Studio Team</p>
        </div>
        <div style="background:#f4efe6;padding:28px 32px;text-align:center;">
          <p style="color:#221f1c;font-size:14px;font-weight:bold;margin:0 0 14px;">Treat yourself to a class this week?</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/classes" style="background:#221f1c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:bold;display:inline-block;">
            Book a Class
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildBookingReminderEmailHtml(opts: {
  firstName: string;
  classTitle: string;
  classDateLabel: string;
  classTimeLabel: string;
  location: string;
}) {
  const { firstName, classTitle, classDateLabel, classTimeLabel, location } = opts;
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#221f1c;padding:32px;text-align:center;">
          <h1 style="color:#f4efe6;font-size:28px;margin:0;letter-spacing:2px;">Sable Studio</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#221f1c;font-size:22px;margin:0 0 16px;">See you soon, ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">
            Just a reminder about your upcoming class:
          </p>
          <div style="background:#f9f9f9;border-radius:12px;padding:20px 24px;margin:16px 0 24px;">
            <p style="color:#221f1c;font-size:18px;font-weight:bold;margin:0 0 6px;">${classTitle}</p>
            <p style="color:#444;font-size:15px;margin:0;">${classDateLabel} · ${classTimeLabel}</p>
            <p style="color:#444;font-size:15px;margin:4px 0 0;">${location}</p>
          </div>
          <p style="color:#444;font-size:16px;margin:0;">See you there!</p>
          <p style="color:#444;font-size:16px;margin:0;">— The Sable Studio Team</p>
        </div>
        <div style="background:#f4efe6;padding:18px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#221f1c;font-size:14px;font-weight:bold;" valign="middle">Need to change your plans?</td>
              <td align="right" valign="middle">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#221f1c;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:50px;font-size:13px;font-weight:bold;white-space:nowrap;display:inline-block;">
                  Manage My Booking
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildWinbackEmailHtml(firstName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#221f1c;padding:32px;text-align:center;">
          <h1 style="color:#f4efe6;font-size:28px;margin:0;letter-spacing:2px;">Sable Studio</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#221f1c;font-size:22px;margin:0 0 16px;">We miss you, ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            It's been a few weeks since your last class. Hope life's just been busy! Your spot is still there whenever you're ready.
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Come back for a class and shake off the week with us.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/classes" style="background:#221f1c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
              Book a Class
            </a>
          </div>
          <p style="color:#444;font-size:16px;margin:0;">Hope to see you soon,</p>
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
