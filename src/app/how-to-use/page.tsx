import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "How to Use · [Studio Name]" };

export default function HowToUsePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Guide</p>
        <h1 className="section-title mb-10">How to Use the App</h1>

        <div className="space-y-8 font-body text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">1. Create an account</h2>
            <p>
              Click <Link href="/auth/signup" className="text-[#2041d8] underline">Sign up</Link> and fill in your details.
              Once you're in, you'll land on your dashboard where you can book classes, manage passes, and more.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">2. Book a class</h2>
            <p>
              Head to <Link href="/classes" className="text-[#2041d8] underline">Classes</Link> to see what's coming up.
              Pick a session and book it — if you have an active pass, a credit is used automatically; otherwise you'll be prompted to pay or buy a pass first.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">3. Passes & pricing</h2>
            <p>
              Visit <Link href="/passes" className="text-[#2041d8] underline">Passes</Link> to see pricing options.
              A pass gives you a set number of class credits to use whenever you like — no need to pay per class once you've got one.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">4. Manage or cancel a booking</h2>
            <p>
              Your upcoming bookings live on your dashboard. You can cancel directly from there — cancelling 24+ hours before class returns your credit automatically.
              See our <Link href="/cancellation-policy" className="text-[#2041d8] underline">Cancellation Policy</Link> for full details.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">5. Videos & playlists</h2>
            <p>
              Check out <Link href="/videos" className="text-[#2041d8] underline">Videos</Link> for class recordings, and Playlists for the music we dance to — great for practicing at home.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">Need help?</h2>
            <p>
              Email us at{" "}
              <a href="mailto:[Studio Email]" className="text-[#2041d8] underline">[Studio Email]</a>{" "}
              and we'll sort you out.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
