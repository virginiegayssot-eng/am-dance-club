import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#e4c3cc] py-24 md:py-36">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-4">
              Every Friday · 7:00 AM
            </p>
            <h1 className="font-heading text-5xl md:text-7xl leading-none mb-6 text-black">
              THE A.M<br />
              <span className="text-[#2041d8]">Dance Club</span>
            </h1>
            <p className="font-body text-lg text-black/70 mb-4 leading-relaxed">
              A 45 minute morning dance class in Manly for adults and teens (12+ years old), designed to boost your energy and confidence.
            </p>
            <p className="font-body text-base text-black/60 mb-8 leading-relaxed">
              Set to Afro, Latin, R&B and pop beats — easy to follow, broken down before the music starts.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/classes" className="btn-primary">View Classes</Link>
              <Link href="/auth/signup" className="btn-secondary">Join the Club</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Blue info strip */}
      <section className="bg-[#2041d8] text-white py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-6 text-sm font-body">
            <span>📍 North Steyne Surf Life Saving Club, Manly NSW 2095</span>
            <span>🕖 Every Friday · 7:00 AM – 7:45 AM</span>
            <span>🎵 Adults & Teens (12+)</span>
            <span>💳 Book & pay online</span>
          </div>
        </div>
      </section>

      {/* Why You'll Love THE AM */}
      <section className="bg-[#e5c3cb] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl md:text-4xl mb-10 text-black">Why You'll Love THE A.M</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Stronger Body", desc: "Wake up your body with movement that builds stamina, tones muscles, and gets your heart pumping." },
              { title: "Energising Mornings", desc: "Swap the snooze button for music and movement that lift your mood and set the tone for the day." },
              { title: "Confidence Boost", desc: "No mirrors, no judgment. Every step, every beat — confidence grows with practice!" },
              { title: "Improved Coordination", desc: "Master choreography designed to challenge and grow your rhythm skills." },
              { title: "Feel-Good Community", desc: "Be part of a fun, inclusive, and empowering community." },
            ].map(f => (
              <div key={f.title} className="bg-[#e4c3cc]/60 rounded-2xl p-6">
                <h3 className="font-heading text-lg text-[#2041d8] mb-2">{f.title}</h3>
                <p className="font-body text-sm text-black/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blue location section */}
      <section className="bg-[#2041d8] text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-wide mb-6">Location & Hours</h2>
              <p className="font-body text-lg leading-relaxed mb-1">North Steyne Surf Life Saving Club</p>
              <p className="font-body text-lg mb-4">Manly NSW 2095</p>
              <p className="font-body text-lg">Fridays 7:00 am to 7:45 am</p>
            </div>
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-wide mb-6">Class Prices</h2>
              <div className="space-y-3 font-body">
                <p><strong>Casual Drop-In:</strong> $24 per class</p>
                <p><strong>Double Pass:</strong> $38 — Two spots in the same class</p>
                <p><strong>Intro Offer:</strong> $39 for 3 classes — First-timers only</p>
                <p><strong>5-Class Pass:</strong> $100 — Valid 6 months</p>
                <p><strong>10-Class Pass:</strong> $200 — Valid 1 year</p>
              </div>
              <Link href="/passes" className="mt-6 inline-block bg-white text-[#2041d8] font-heading text-sm px-6 py-3 rounded-full hover:bg-[#e4c3cc] transition-colors">
                Buy a Pass
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#e4c3cc] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-4xl md:text-5xl mb-4 text-black">Ready to dance?</h2>
          <p className="font-body text-black/60 mb-8 max-w-md mx-auto">
            Join THE A.M Dance Club and book your first Friday session today.
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
