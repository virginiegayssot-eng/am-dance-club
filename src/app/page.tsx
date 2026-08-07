import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#e2d0fb] py-24 md:py-36">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-4">
              Reggaeton Dance Classes · Sydney
            </p>
            <h1 className="font-heading text-5xl md:text-7xl leading-none mb-6">
              <span className="text-[#000000]">BYLA</span>
            </h1>
            <p className="font-body text-lg text-black/70 mb-4 leading-relaxed">
              Hola! Reggaeton classes made for beginner to intermediate dancers, with sessions in Alexandria and Manly — no experience required, just bring your energy.
            </p>
            <p className="font-body text-base text-black/60 mb-8 leading-relaxed">
              Latin-inspired, high-energy, and full of heart — dance with one of Sydney's happiest communities.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/classes" className="btn-secondary">View Classes</Link>
              <Link href="/auth/signup" className="btn-primary">Join Now</Link>
              <Link href="/auth/login" className="font-body text-sm text-black/60 hover:text-[#000000] transition-colors self-center underline underline-offset-2">Already a member? Log in</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Info strip */}
      <section className="bg-[#000000] text-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 md:gap-y-0 divide-y-0 md:divide-x md:divide-white/20">
            {[
              { label: "Location", value: "Alexandria & Manly, Sydney" },
              { label: "Schedule", value: "Tue (City) · Thu (Manly)" },
              { label: "Who", value: "Beginner to Intermediate" },
              { label: "Booking", value: "Book & pay online" },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center text-center gap-1.5 px-4">
                <p className="font-heading text-xs uppercase tracking-widest text-[#e2d0fb]">{item.label}</p>
                <p className="font-body text-sm text-white/90 leading-snug">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why You'll Love BYLA */}
      <section className="bg-[#d1b3f5] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl md:text-4xl mb-10 text-[#000000]">Why You'll Love BYLA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Stronger Body", desc: "Move to Reggaeton beats that build stamina, tone muscles, and get your heart pumping." },
              { title: "End-of-Day Energy", desc: "Swap the couch for music and movement that lift your mood after a long day." },
              { title: "Confidence Boost", desc: "No mirrors, no judgment. Every step, every beat — confidence grows with practice!" },
              { title: "Improved Coordination", desc: "Master choreography designed to challenge and grow your rhythm skills." },
              { title: "Feel-Good Community", desc: "Be part of a fun, inclusive, and empowering community." },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6">
                <h3 className="font-heading text-lg text-[#000000] mb-2">{f.title}</h3>
                <p className="font-body text-sm text-black/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Majo */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-4">Meet the founder</p>
          <h2 className="font-heading text-3xl md:text-4xl mb-8 text-[#000000]">About Majo</h2>
          <p className="font-body text-lg text-black/70 leading-relaxed">
            Hola! I'm Majo, an energetic latina from Peru who LOVES connecting people through dance. I started BYLA because I missed home. What started as a dance class has become one of the happiest latin-inspired dance communities in Sydney. BYLA ("baila" means "to dance" in Spanish) and it also stands for "By Latina". Thanks for being here.
          </p>
          <p className="font-heading text-lg text-[#000000] mt-6">With love, Majo x</p>
        </div>
      </section>

      {/* Location section */}
      <section className="bg-[#000000] text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-wide mb-6 text-[#e2d0fb]">Location & Hours</h2>
              <p className="font-body text-lg leading-relaxed mb-1"><strong>BYLA City</strong> — Alexandria</p>
              <p className="font-body text-lg mb-4">Tuesdays 7:30pm</p>
              <p className="font-body text-lg leading-relaxed mb-1"><strong>BYLA Manly</strong> — Manly</p>
              <p className="font-body text-lg">Thursdays 7:00pm</p>
            </div>
            <div>
              <h2 className="font-heading text-2xl uppercase tracking-wide mb-6 text-[#e2d0fb]">Class Prices</h2>
              <div className="space-y-3 font-body">
                <p><strong>Casual Drop-In:</strong> $26 per class</p>
                <p><strong>5-Class Pack:</strong> $120 — Valid 2 months</p>
                <p><strong>10-Class Pack:</strong> $220</p>
              </div>
              <Link href="/passes" className="mt-6 inline-block bg-white text-[#000000] font-heading text-sm px-6 py-3 rounded-full hover:bg-[#e2d0fb] transition-colors">
                Buy a Pass
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#e2d0fb] py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-4xl md:text-5xl mb-4 text-black">Ready to dance?</h2>
          <p className="font-body text-black/60 mb-8 max-w-md mx-auto">
            Join BYLA and book your first session today.
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
