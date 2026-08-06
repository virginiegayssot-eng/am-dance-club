import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#334155] text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image src="/logo.png" alt="[Studio Name]" width={90} height={60} className="object-contain mb-4" />
            <p className="font-body text-sm text-white/70 leading-relaxed">
              [One-line description of the class.]<br />
              [Schedule]
            </p>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest mb-3 text-[#e2e8f0]">Location & Hours</h4>
            <p className="font-body text-sm text-white/70 leading-relaxed">
              [Studio Address Line 1]<br />
              [Studio Address Line 2]<br /><br />
              [Schedule]
            </p>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest mb-3 text-[#e2e8f0]">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {[
                { href: "/how-to-use", label: "How to Use" },
                { href: "/classes", label: "Classes" },
                { href: "/passes", label: "Passes & Pricing" },
                { href: "/videos", label: "Videos" },
                { href: "/playlists", label: "Playlists" },
                { href: "/auth/login", label: "Log in" },
                { href: "[Shop merch URL]", label: "Shop Merch" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="font-body text-sm text-white/70 hover:text-[#e2e8f0] transition-colors">
                  {label}
                </Link>
              ))}
              <a href="[Website URL]" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-white/70 hover:text-[#e2e8f0] transition-colors">
                Website
              </a>
              <a
                href="[Instagram URL]"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
                className="text-white/70 hover:text-[#e2e8f0] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-body text-xs text-white/40">
            © {new Date().getFullYear()} [Studio Name]. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/cancellation-policy" className="font-body text-xs text-white/40 hover:text-white/60 transition-colors">
              Cancellation Policy
            </Link>
            <Link href="/privacy-policy" className="font-body text-xs text-white/40 hover:text-white/60 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
