export function buildBookingCancellationEmailHtml({
  firstName,
  classTitle,
  classDate,
  passRefunded,
  cancelledByInstructor = false,
}: {
  firstName: string;
  classTitle: string;
  classDate: string;
  passRefunded: boolean;
  cancelledByInstructor?: boolean;
}) {
  const refundNote = passRefunded
    ? "Your class credit has been refunded back to your pass, so you're free to book another session."
    : cancelledByInstructor
      ? `If you paid for this class directly, please reach out to us at <a href="mailto:[Studio Email]" style="color:#334155;">[Studio Email]</a> and we'll sort out a refund.`
      : "This booking was inside the 24-hour window, so no credit was refunded for this cancellation.";

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:#334155;padding:32px;text-align:center;">
          <h1 style="color:#e2e8f0;font-size:28px;margin:0;letter-spacing:2px;">[Studio Name]</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#334155;font-size:22px;margin:0 0 16px;">
            ${cancelledByInstructor ? `This class has been cancelled` : `Booking cancelled, ${firstName}`}
          </h2>
          ${cancelledByInstructor
            ? `<p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${firstName}, unfortunately we've had to cancel this class.</p>`
            : ""}
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">
            <strong>${classTitle}</strong>
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            ${classDate} · [Studio Location]
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 16px;">
            ${refundNote}
          </p>
          <p style="color:#444;font-size:16px;line-height:1.6;margin:0 0 8px;">Hope to see you at another class soon!</p>
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
