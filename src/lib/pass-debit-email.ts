export function buildPassDebitEmailHtml({
  firstName,
  passName,
  classesRemaining,
}: {
  firstName: string;
  passName: string;
  classesRemaining: number;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#7d6653;padding:32px;text-align:center;">
          <h1 style="color:#f0e8dd;font-size:28px;margin:0;letter-spacing:2px;">Sable Studio</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#7d6653;font-size:22px;margin:0 0 16px;">Class recorded, ${firstName}</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            1 class has been deducted from your <strong>${passName}</strong>.
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            You have <strong>${classesRemaining} class${classesRemaining !== 1 ? "es" : ""} remaining</strong>.
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">See you next class!</p>
          <p style="color:#444;font-size:16px;margin:0;">— The Sable Studio Team</p>
        </div>
        <div style="background:#f0e8dd;padding:20px;text-align:center;">
          <p style="color:#7d6653;font-size:12px;margin:0;">Weekly classes · Sydney, NSW</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
