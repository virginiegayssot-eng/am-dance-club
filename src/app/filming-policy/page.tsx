import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Class Filming & Photography Policy · BYLA" };

export default function FilmingPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-2">Legal</p>
        <h1 className="section-title mb-10">Class Filming & Photography Policy</h1>

        <div className="space-y-8 font-body text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-heading text-lg text-[#000000] mb-3">Filming and photography may occur</h2>
            <p>
              Our classes may be filmed or photographed for social media and/or marketing purposes.
              By attending a class, you acknowledge that filming or photography may take place during the session.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#000000] mb-3">If you don't want to appear</h2>
            <p>
              <strong>If you do not wish to appear in any photos or videos, it is your responsibility to let the instructor know before filming begins.</strong>{" "}
              You should also position yourself outside of the filming area or sit out while filming is taking place.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#000000] mb-3">Our commitment</h2>
            <p>
              Our instructors will do their best to respect requests not to be filmed. However, as classes are active environments, we cannot guarantee that a student will never appear incidentally in the background of footage.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#000000] mb-3">Questions or concerns</h2>
            <p>
              If you have any concerns about filming or photography, please speak with the instructor before the class begins so we can do our best to accommodate you.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#000000] mb-3">By attending</h2>
            <p>
              By attending our classes, you agree to follow these guidelines and understand that you are responsible for communicating any request not to be filmed to the instructor.
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
