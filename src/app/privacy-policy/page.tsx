import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Privacy Policy · [Studio Name]" };

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-[#334155] mb-2">Legal</p>
        <h1 className="section-title mb-10">Privacy Policy</h1>

        <div className="space-y-8 font-body text-gray-700 leading-relaxed">

          <section>
            <p>
              [Studio Name] ("we", "us", "our") is committed to protecting your personal information in accordance with the
              Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).
              This policy explains what information we collect, how we use it, and how we protect it.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#334155] mb-3">What information we collect</h2>
            <p>When you create an account or purchase a class, we may collect:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Your name and email address</li>
              <li>Your phone number (optional)</li>
              <li>Class booking and attendance history</li>
              <li>Payment information (processed securely by Stripe — we do not store card details)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#334155] mb-3">How we use your information</h2>
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
            <h2 className="font-heading text-lg text-[#334155] mb-3">Data storage & security</h2>
            <p>
              Your data is stored securely using Supabase, hosted on servers in Australia and the United States.
              Payments are processed by Stripe, which is PCI-DSS compliant.
              We take reasonable steps to protect your information from misuse, loss, or unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#334155] mb-3">Your rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Access the personal information we hold about you</li>
              <li>Request corrections to your information</li>
              <li>Request deletion of your account and data</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:[Studio Email]" className="text-[#334155] underline">[Studio Email]</a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#334155] mb-3">Cookies</h2>
            <p>
              This app uses essential cookies to keep you logged in. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#334155] mb-3">Contact</h2>
            <p>
              If you have any questions about this policy or how we handle your data, please contact us at{" "}
              <a href="mailto:[Studio Email]" className="text-[#334155] underline">[Studio Email]</a>.
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
