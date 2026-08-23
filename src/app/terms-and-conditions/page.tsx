import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "Terms & Conditions · BYLA" };

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-2">Legal</p>
        <h1 className="section-title mb-6">Terms & Conditions</h1>
        <p className="font-body text-gray-500 mb-8 leading-relaxed">
          By creating an account or attending a class, you agree to the policies below.
        </p>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 pb-8 border-b border-gray-100">
          <a href="#cancellation" className="font-body text-sm text-[#000000] underline">Cancellation Policy</a>
          <a href="#privacy" className="font-body text-sm text-[#000000] underline">Privacy Policy</a>
          <a href="#filming" className="font-body text-sm text-[#000000] underline">Filming & Photography Policy</a>
        </nav>

        <div className="space-y-16 font-body text-gray-700 leading-relaxed">

          <div id="cancellation">
            <h2 className="font-heading text-2xl text-[#000000] mb-6">Cancellation Policy</h2>
            <div className="space-y-8">

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Passes are non-refundable</h3>
                <p>
                  Once purchased, a class pass itself cannot be refunded or exchanged for cash. What you can do is cancel individual bookings. Cancelling 24+ hours ahead returns that one credit to your pass to use on another class, as set out below.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Cancellations with 24+ hours notice</h3>
                <p>
                  You may cancel your booking up to 24 hours before your class without any penalty.
                  If your booking was made using a class pass, one credit will automatically be returned to your pass so you can book another session.
                  If you paid by card, Apple Pay, or Google Pay, please contact us at{" "}
                  <a href="mailto:hello@byla.fit" className="text-[#000000] underline">hello@byla.fit</a> to arrange a refund.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Cancellations within 24 hours</h3>
                <p>
                  Cancellations made within 24 hours of your scheduled class cannot be refunded.
                  Your pass credit will be marked as used and cannot be rescheduled.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">No-shows</h3>
                <p>
                  If you do not attend a class and do not cancel beforehand, your pass or payment will be forfeited and no refund or rescheduling will be provided.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Emergency or illness</h3>
                <p>
                  If you are unable to attend due to illness or emergency, please reach out to us as soon as possible at{" "}
                  <a href="mailto:hello@byla.fit" className="text-[#000000] underline">hello@byla.fit</a>.
                  We will do our best to accommodate you.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">How to cancel</h3>
                <p>
                  Log in to your account and visit your{" "}
                  <Link href="/dashboard" className="text-[#000000] underline">Dashboard</Link> to cancel an upcoming booking directly.
                  You can also contact us at{" "}
                  <a href="mailto:hello@byla.fit" className="text-[#000000] underline">hello@byla.fit</a>.
                </p>
              </section>

            </div>
          </div>

          <div id="privacy">
            <h2 className="font-heading text-2xl text-[#000000] mb-6">Privacy Policy</h2>
            <div className="space-y-8">

              <section>
                <p>
                  BYLA ("we", "us", "our") is committed to protecting your personal information in accordance with the
                  Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).
                  This policy explains what information we collect, how we use it, and how we protect it.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">What information we collect</h3>
                <p>When you create an account or purchase a class, we may collect:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                  <li>Your name and email address</li>
                  <li>Your phone number (optional)</li>
                  <li>Class booking and attendance history</li>
                  <li>Payment information (processed securely by Stripe — we do not store card details)</li>
                </ul>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">How we use your information</h3>
                <p>We use your information to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                  <li>Manage your bookings and passes</li>
                  <li>Send booking confirmations and class reminders</li>
                  <li>Send occasional emails about classes and updates (you may unsubscribe at any time)</li>
                  <li>Improve our services</li>
                </ul>
                <p className="mt-3">We will never sell or share your personal information with third parties for marketing purposes.</p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Data storage & security</h3>
                <p>
                  Your data is stored securely using Supabase, hosted on servers in Australia and the United States.
                  Payments are processed by Stripe, which is PCI-DSS compliant.
                  We take reasonable steps to protect your information from misuse, loss, or unauthorised access.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Your rights</h3>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                  <li>Access the personal information we hold about you</li>
                  <li>Request corrections to your information</li>
                  <li>Request deletion of your account and data</li>
                </ul>
                <p className="mt-3">
                  To exercise any of these rights, please contact us at{" "}
                  <a href="mailto:hello@byla.fit" className="text-[#000000] underline">hello@byla.fit</a>.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Cookies</h3>
                <p>
                  This app uses essential cookies to keep you logged in. We do not use tracking or advertising cookies.
                </p>
              </section>

            </div>
          </div>

          <div id="filming">
            <h2 className="font-heading text-2xl text-[#000000] mb-6">Filming & Photography Policy</h2>
            <div className="space-y-8">

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Filming and photography may occur</h3>
                <p>
                  Our classes may be filmed or photographed for social media and/or marketing purposes.
                  By attending a class, you acknowledge that filming or photography may take place during the session.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">If you don't want to appear</h3>
                <p>
                  <strong>If you do not wish to appear in any photos or videos, it is your responsibility to let the instructor know before filming begins.</strong>{" "}
                  You should also position yourself outside of the filming area or sit out while filming is taking place.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Our commitment</h3>
                <p>
                  Our instructors will do their best to respect requests not to be filmed. However, as classes are active environments, we cannot guarantee that a student will never appear incidentally in the background of footage.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-lg text-[#000000] mb-3">Questions or concerns</h3>
                <p>
                  If you have any concerns about filming or photography, please speak with the instructor before the class begins so we can do our best to accommodate you.
                </p>
              </section>

            </div>
          </div>

        </div>

        <p className="text-sm text-gray-400 pt-8 mt-12 border-t border-gray-100">
          Last updated: August 2026. By attending our classes or using this app, you agree to all of the above.
        </p>
      </main>
      <Footer />
    </div>
  );
}
