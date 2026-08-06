import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#e2e8f0] py-24 md:py-36">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#334155] mb-4">
              [Schedule]
            </p>
            <h1 className="font-heading text-5xl md:text-7xl leading-none mb-6">
              <span className="text-[#334155]">[Studio Name]</span>
            </h1>
            <p className="font-body text-lg text-black/70 mb-4 leading-relaxed">
              [One or two sentences describing the class: duration, location, who it's for, and what it does for them.]
            </p>
            <p className="font-body text-base text-black/60 mb-8 leading-relaxed">
              [Optional second line — music style, teaching approach, vibe, etc.]
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/classes" className="btn-secondary">View Classes</Link>
              <Link href="/auth/signup" className="btn-primary">Join Now</Link>
              <Link href="/auth/login" className="font-body text-sm text-black/60 hover:text-[#334155] transition-colors self-center underline underline-offset-2">Already a member? Log in</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Blue info strip */}
      <section className="bg-[#334155] text-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 md:gap-y-0 divide-y-0 md:divide-x md:divide-white/20">
            {[
              { label: "Location", value: "[Studio Location]" },
              { label: "Schedule", value: "[Schedule]" },
              { label: "Who", value: "[Who it's for]" },
              { label: "Booking", value: "Book & pay online" },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center text-center gap-1.5 px-4">
                <p className="font-heading text-xs uppercase tracking-widest text-[#e2e8f0]">{item.label}</p>
                <p className="font-body text-sm text-white/90 leading-snug">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why You'll Love THE AM */}
      <section className="bg-[#cbd5e1] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl md:text-4xl mb-10 text-[#334155]">Why You'll Love [Studio Name]</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Stronger Body", desc: "Wake up your body with movement that builds stamina, tones muscles, and gets your heart pumping." },
              { title: "Energising Mornings", desc: "Swap the snooze button for music and movement that lift your mood and set the tone for the day." },
              { title: "Confidence Boost", desc: "No mirrors, no judgment. Every step, every beat — confidence grows with practice!" },
              { title: "Improved Coordination", desc: "Master choreography designed to challenge and grow your rhythm skills." },
              { title: "Feel-Good Community", desc: "Be part of a fun, inclusive, and empowering community." },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6">
                <h3 className="font-heading text-lg text-[#334155] mb-2">{f.title}</h3>
                <p className="font-body text-sm text-black/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blue location section */}
      <section className="bg-[#334155] text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-wide mb-6 text-[#e2e8f0]">Location & Hours</h2>
              <p className="font-body text-lg leading-relaxed mb-1">[Studio Address Line 1]</p>
              <p className="font-body text-lg mb-4">[Studio Address Line 2]</p>
              <p className="font-body text-lg">[Schedule]</p>
            </div>
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-wide mb-6 text-[#e2e8f0]">Class Prices</h2>
              <div className="space-y-3 font-body">
                <p><strong>Casual Drop-In:</strong> [Price] per class</p>
                <p><strong>Double Pass:</strong> [Price] — Two spots in the same class</p>
                <p><strong>Intro Offer:</strong> [Price] for [N] classes — First-timers only</p>
                <p><strong>5-Class Pass:</strong> [Price] — Valid [N months/years]</p>
                <p><strong>10-Class Pass:</strong> [Price] — Valid [N months/years]</p>
              </div>
              <Link href="/passes" className="mt-6 inline-block bg-white text-[#334155] font-heading text-sm px-6 py-3 rounded-full hover:bg-[#e2e8f0] transition-colors">
                Buy a Pass
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#e2e8f0] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-4xl md:text-5xl mb-4 text-black">Ready to dance?</h2>
          <p className="font-body text-black/60 mb-8 max-w-md mx-auto">
            Join [Studio Name] and book your first session today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth/signup" className="btn-primary">Create Account</Link>
            <Link href="/classes" className="btn-secondary">Browse Classes</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
