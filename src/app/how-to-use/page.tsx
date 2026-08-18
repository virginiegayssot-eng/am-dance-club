import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { Share, MoreVertical, Plus, ArrowRight, Mail } from "lucide-react";

export const metadata = { title: "How to Use · THE A.M Dance Club" };

function Chip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center font-bold text-[0.85em] bg-[#2041d8]/10 border border-[#2041d8]/20 text-[#2041d8] rounded-lg px-2 py-0.5 hover:bg-[#2041d8]/20 transition-colors">
      {children}
    </Link>
  );
}

function StepCard({ id, num, who, title, children }: {
  id: string;
  num: number;
  who: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white border border-[#2041d8]/10 rounded-2xl shadow-sm p-6 sm:p-7 scroll-mt-28">
      <div className="flex items-start gap-4 mb-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#2041d8]/10 text-[#2041d8] flex items-center justify-center font-heading text-base">{num}</div>
        <div>
          <p className="font-body text-xs uppercase tracking-widest text-gray-400 mb-0.5">{who}</p>
          <h2 className="font-heading text-lg text-black">{title}</h2>
        </div>
      </div>
      <div className="font-body text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

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

const QUICKNAV = [
  { href: "#account", label: "1. Account" },
  { href: "#book", label: "2. Book a class" },
  { href: "#passes", label: "3. Passes & pricing" },
  { href: "#cancel", label: "4. Cancel a booking" },
  { href: "#videos", label: "5. Videos" },
  { href: "#playlists", label: "6. Playlists" },
  { href: "#chat", label: "7. Chat" },
  { href: "#news", label: "8. Club News" },
  { href: "#profile", label: "9. Your profile" },
  { href: "#policy", label: "10. Cancellation policy" },
  { href: "#install", label: "11. Home screen" },
  { href: "#notifications", label: "12. Notifications" },
];

export default function HowToUsePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fff8f3]">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="mb-8">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Guide</p>
          <h1 className="section-title mb-3">How to Use the App</h1>
          <p className="font-body text-sm text-gray-500">Everything you need to book, pay, and keep dancing.</p>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {QUICKNAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 font-body text-xs font-semibold text-gray-500 bg-white border border-[#2041d8]/10 rounded-full px-3 py-1.5 hover:text-[#2041d8] hover:border-[#2041d8]/30 transition-colors whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="space-y-5">

          <StepCard id="account" num={1} who="Getting started" title="Create an account">
            <p>
              Click <Chip href="/auth/signup">Sign up</Chip> and fill in your details.
              Once you're in, you'll land on your dashboard where you can book classes, manage passes, and more.
            </p>
          </StepCard>

          <StepCard id="book" num={2} who="Find a session" title="Book a class">
            <p>
              Head to <Chip href="/classes">Classes</Chip> to see what's coming up.
              Pick a session and book it, if you have an active pass, a credit is used automatically; otherwise you'll be prompted to pay or buy a pass first.
            </p>
          </StepCard>

          <StepCard id="passes" num={3} who="Credits & pricing" title="Passes & pricing">
            <p>
              Visit <Chip href="/passes">Passes</Chip> to see pricing options.
              A pass gives you a set number of class credits to use whenever you like, no need to pay per class once you've got one.
            </p>
          </StepCard>

          <StepCard id="cancel" num={4} who="Change of plans" title="Cancel a booking">
            <p>
              Your upcoming bookings live on your dashboard. Tap <strong>Cancel booking</strong> next to the one you can't make.
              Cancelling 24+ hours before class returns your credit automatically, see the <Chip href="#policy">Cancellation Policy</Chip> below for what happens inside that window.
            </p>
          </StepCard>

          <StepCard id="videos" num={5} who="Practice at home" title="Watch class videos">
            <p>
              Check out <Chip href="/videos">Videos</Chip> for the choreo library. Tap any thumbnail to play it in the app.
            </p>
          </StepCard>

          <StepCard id="playlists" num={6} who="The vibe" title="Playlists">
            <p>
              Head to <Chip href="/playlists">Playlists</Chip> to see what's been curated for class, each one opens straight into Spotify.
            </p>
          </StepCard>

          <StepCard id="chat" num={7} who="Stay connected" title="Chat">
            <p>
              Tap <Chip href="/chat">Chat</Chip> in the menu. <strong>Group Chat</strong> is open to everyone in the club, or message an instructor directly for anything private, they'll get notified.
            </p>
          </StepCard>

          <StepCard id="news" num={8} who="Don't miss an update" title="Club News">
            <p>
              Announcements, schedule changes, events, that kind of thing, show right at the top of your <Chip href="/dashboard">Dashboard</Chip> whenever you open the app. Pinned posts stay at the top.
            </p>
          </StepCard>

          <StepCard id="profile" num={9} who="Keep your details current" title="Your profile">
            <p>
              Tap <Chip href="/profile">My Profile</Chip> to update your name, phone or birthday any time, and tap <strong>Change photo</strong> to add or update your profile picture.
            </p>
          </StepCard>

          <StepCard id="policy" num={10} who="Worth knowing before you book" title="Cancellation policy">
            <p>
              Cancel at least <strong>24 hours</strong> before class and your credit is returned automatically, or a refund is arranged if you paid casually.
              Cancel later than that, or don't show up, and the credit or payment isn't refunded or rescheduled.
              Full details on the <Chip href="/cancellation-policy">Cancellation Policy</Chip> page.
            </p>
          </StepCard>

          <StepCard id="install" num={11} who="One-time setup, worth doing" title="Add THE A.M to your home screen">
            <p className="mb-6">
              Once it's on your home screen, THE A.M opens full-screen like a real app, no browser bar, and faster to get into.
            </p>
            <div className="rounded-2xl border border-[#2041d8]/10 bg-[#fff8f3] p-6 grid sm:grid-cols-2 gap-8">
              <HomeScreenSteps
                platform="iPhone — Safari"
                icon1={<Share className="w-6 h-6 text-[#2041d8]" strokeWidth={1.75} />}
                caption1={<>Tap the Share icon in Safari's toolbar</>}
                caption2={<>Scroll down, tap <strong>Add to Home Screen</strong></>}
                caption3={<>Tap <strong>Add</strong>, THE A.M is on your home screen</>}
              />
              <HomeScreenSteps
                platform="Android — Chrome"
                icon1={<MoreVertical className="w-6 h-6 text-[#2041d8]" strokeWidth={1.75} />}
                caption1={<>Tap the ⋮ menu in Chrome's toolbar</>}
                caption2={<>Tap <strong>Add to Home screen</strong></>}
                caption3={<>Tap <strong>Add</strong>, done!</>}
              />
            </div>
          </StepCard>

          <StepCard id="notifications" num={12} who="Stay in the loop" title="Turn on notifications">
            <p>
              Head to <Chip href="/profile">My Profile</Chip> and switch on <strong>Push Notifications</strong>.
              You'll get an alert on this device whenever there's a new video, a message in the group chat, or club news, no need to have the app open.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              On iPhone, this only works once THE A.M is added to your home screen (see step 11 above) — Safari will ask you to allow notifications the first time you turn it on.
            </p>
          </StepCard>

          <div className="bg-[#2041d8] rounded-2xl p-6 sm:p-7 text-white flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Mail className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-heading text-lg mb-1">Need help?</h2>
              <p className="font-body text-sm text-white/80">
                Email us at{" "}
                <a href="mailto:theamdance@gmail.com" className="underline hover:text-[#e4c3cc]">theamdance@gmail.com</a>{" "}
                and we'll sort you out.
              </p>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
