import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { Share, MoreVertical, Plus, ArrowRight } from "lucide-react";

function HomeScreenSteps({ platform, icon1, caption1, caption2, caption3 }: {
  platform: string;
  icon1: React.ReactNode;
  caption1: React.ReactNode;
  caption2: React.ReactNode;
  caption3: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-heading text-sm text-black mb-4">{platform}</p>
      <div className="grid grid-cols-[56px_24px_56px_24px_56px] gap-x-2 gap-y-3 items-center">
        <div className="w-14 h-14 rounded-2xl bg-[#e4c3cc]/50 flex items-center justify-center">{icon1}</div>
        <div className="flex items-center justify-center text-gray-300"><ArrowRight className="w-4 h-4" /></div>
        <div className="w-14 h-14 rounded-2xl bg-[#e4c3cc]/50 flex items-center justify-center"><Plus className="w-6 h-6 text-[#2041d8]" strokeWidth={1.75} /></div>
        <div className="flex items-center justify-center text-gray-300"><ArrowRight className="w-4 h-4" /></div>
        <div className="w-14 h-14 rounded-2xl bg-black overflow-hidden">
          <Image src="/icon-192.png" alt="THE A.M" width={56} height={56} className="w-full h-full object-cover" />
        </div>

        <p className="text-xs text-gray-500 text-center leading-snug">{caption1}</p>
        <div />
        <p className="text-xs text-gray-500 text-center leading-snug">{caption2}</p>
        <div />
        <p className="text-xs text-gray-500 text-center leading-snug">{caption3}</p>
      </div>
    </div>
  );
}

export const metadata = { title: "How to Use · THE A.M Dance Club" };

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
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">6. Add THE A.M to your home screen</h2>
            <p className="mb-6">
              Once it's on your home screen, THE A.M opens full-screen like a real app — no browser bar, and faster to get into.
            </p>
            <div className="rounded-2xl border border-[#2041d8]/10 bg-[#fff8f3]/60 p-6 grid sm:grid-cols-2 gap-8">
              <HomeScreenSteps
                platform="iPhone — Safari"
                icon1={<Share className="w-6 h-6 text-[#2041d8]" strokeWidth={1.75} />}
                caption1={<>Tap the Share icon in Safari's toolbar</>}
                caption2={<>Scroll down, tap <strong>Add to Home Screen</strong></>}
                caption3={<>Tap <strong>Add</strong> — THE A.M is on your home screen</>}
              />
              <HomeScreenSteps
                platform="Android — Chrome"
                icon1={<MoreVertical className="w-6 h-6 text-[#2041d8]" strokeWidth={1.75} />}
                caption1={<>Tap the ⋮ menu in Chrome's toolbar</>}
                caption2={<>Tap <strong>Add to Home screen</strong></>}
                caption3={<>Tap <strong>Add</strong> — done!</>}
              />
            </div>
          </section>

          <section>
            <h2 className="font-heading text-lg text-[#2041d8] mb-3">Need help?</h2>
            <p>
              Email us at{" "}
              <a href="mailto:theamdance@gmail.com" className="text-[#2041d8] underline">theamdance@gmail.com</a>{" "}
              and we'll sort you out.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
