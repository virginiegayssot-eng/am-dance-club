import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "Cancellation Policy · THE A.M Dance Club" };

export default function CancellationPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Legal</p>
        <h1 className="section-title mb-10">Cancellation Policy</h1>

        <div className="space-y-8 font-body text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">Passes are non-refundable</h2>
            <p>
              Once purchased, a class pass itself cannot be refunded or exchanged for cash. What you can do is cancel individual bookings. Cancelling 24+ hours ahead returns that one credit to your pass to use on another class, as set out below.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">Cancellations with 24+ hours notice</h2>
            <p>
              You may cancel your booking up to 24 hours before your class without any penalty.
              If your booking was made using a class pass, one credit will automatically be returned to your pass so you can book another session.
              If you paid by card, Apple Pay, or Google Pay, please contact us at{" "}
              <a href="mailto:theamdance@gmail.com" className="text-[#2041d8] underline">theamdance@gmail.com</a> to arrange a refund.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">Cancellations within 24 hours</h2>
            <p>
              Cancellations made within 24 hours of your scheduled class cannot be refunded.
              Your pass credit will be marked as used and cannot be rescheduled.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">No-shows</h2>
            <p>
              If you do not attend a class and do not cancel beforehand, your pass or payment will be forfeited and no refund or rescheduling will be provided.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">Emergency or illness</h2>
            <p>
              If you are unable to attend due to illness or emergency, please reach out to us as soon as possible at{" "}
              <a href="mailto:theamdance@gmail.com" className="text-[#2041d8] underline">theamdance@gmail.com</a>.
              We will do our best to accommodate you.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">How to cancel</h2>
            <p>
              Log in to your account and visit your{" "}
              <Link href="/dashboard" className="text-[#2041d8] underline">Dashboard</Link> to cancel an upcoming booking directly.
              You can also contact us at{" "}
              <a href="mailto:theamdance@gmail.com" className="text-[#2041d8] underline">theamdance@gmail.com</a>.
            </p>
          </section>

          <p className="text-sm text-gray-400 pt-4 border-t border-gray-100">
            Last updated: May 2026
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
