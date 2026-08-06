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
        <div style="background:#334155;padding:32px;text-align:center;">
          <h1 style="color:#e2e8f0;font-size:28px;margin:0;letter-spacing:2px;">[Studio Name]</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#334155;font-size:22px;margin:0 0 16px;">Order confirmed, ${firstName}!</h2>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">
            <strong>${productTitle}</strong>${size ? ` · Size ${size}` : ""}
          </p>
          ${price ? `<p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">${price}</p>` : ""}
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">We'll be in touch about pickup/delivery details.</p>
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
