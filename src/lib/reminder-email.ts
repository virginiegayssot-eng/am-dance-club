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
        <div style="background:#334155;padding:32px;text-align:center;">
          <h1 style="color:#e2e8f0;font-size:28px;margin:0;letter-spacing:2px;">[Studio Name]</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#334155;font-size:22px;margin:0 0 16px;">See you soon, ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">
            Just a reminder about your upcoming class:
          </p>
          <div style="background:#f9f9f9;border-radius:12px;padding:20px 24px;margin:16px 0 24px;">
            <p style="color:#334155;font-size:18px;font-weight:bold;margin:0 0 6px;">${classTitle}</p>
            <p style="color:#444;font-size:15px;margin:0;">${classDateLabel} · ${classTimeLabel}</p>
            <p style="color:#444;font-size:15px;margin:4px 0 0;">${location}</p>
          </div>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Can't make it anymore? Cancel from your dashboard so we can offer your spot to someone else.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#334155;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
              View Booking
            </a>
          </div>
          <p style="color:#444;font-size:16px;margin:0;">See you there!</p>
          <p style="color:#444;font-size:16px;margin:0;">[Instructor Name]</p>
        </div>
        <div style="background:#e2e8f0;padding:20px;text-align:center;">
          <p style="color:#334155;font-size:12px;margin:0;">[Schedule] · [Studio Location]</p>
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
        <div style="background:#334155;padding:32px;text-align:center;">
          <h1 style="color:#e2e8f0;font-size:28px;margin:0;letter-spacing:2px;">[Studio Name]</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#334155;font-size:22px;margin:0 0 16px;">We miss you, ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            It's been a few weeks since your last class — hope life's just been busy! Your spot is still there whenever you're ready.
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Come back for a class and shake off the week with us.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/classes" style="background:#334155;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:bold;display:inline-block;">
              Book a Class
            </a>
          </div>
          <p style="color:#444;font-size:16px;margin:0;">Hope to see you soon,</p>
          <p style="color:#444;font-size:16px;margin:0;">[Instructor Name]</p>
        </div>
        <div style="background:#e2e8f0;padding:20px;text-align:center;">
          <p style="color:#334155;font-size:12px;margin:0;">[Schedule] · [Studio Location]</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
