import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Injury & Safety Policy · THE A.M Dance Club" };

export default function SafetyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Legal</p>
        <h1 className="section-title mb-10">Injury & Safety</h1>

        <div className="space-y-8 font-body text-gray-700 leading-relaxed">

          <section>
            <p>
              Your safety and wellbeing are important to us. Please let your instructor know if you have an injury, medical condition or any movement limitations before class so we can help you participate safely.
            </p>
          </section>

          <section>
            <p>
              If you become injured or feel unwell during class, please stop and let the instructor know straight away. We will check in with you and provide reasonable assistance where possible.
            </p>
          </section>

          <section>
            <p>
              We want our classes to be welcoming and inclusive. If you have accessibility needs or require a modification to a movement, please let us know. We will do our best to accommodate you where reasonably possible.
            </p>
          </section>

          <section>
            <p>
              Please always listen to your body and participate at a level that feels safe and comfortable for you.
            </p>
          </section>

          <p className="text-sm text-gray-400 pt-4 border-t border-gray-100">
            Last updated: August 2026
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
