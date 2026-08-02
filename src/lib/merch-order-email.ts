export function buildMerchOrderEmailHtml({
  firstName,
  productTitle,
  size,
  amountPaidCents,
}: {
  firstName: string;
  productTitle: string;
  size: string | null;
  amountPaidCents: number | null;
}) {
  const price = amountPaidCents != null
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amountPaidCents / 100)
    : null;

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
          <h2 style="color:#2041d8;font-size:22px;margin:0 0 16px;">Order confirmed, ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">
            <strong>${productTitle}</strong>${size ? ` · Size ${size}` : ""}
          </p>
          ${price ? `<p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">${price}</p>` : ""}
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">We'll be in touch about pickup/delivery details.</p>
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
