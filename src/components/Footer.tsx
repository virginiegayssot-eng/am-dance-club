import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#2041d8] text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image src="/logo.png" alt="THE A.M Dance Club" width={90} height={60} className="object-contain mb-4" />
            <p className="font-body text-sm text-white/70 leading-relaxed">
              Morning dance classes for adults & teens (12+).<br />
              Every Friday at 7:00 AM.
            </p>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest mb-3 text-[#e4c3cc]">Location & Hours</h4>
            <p className="font-body text-sm text-white/70 leading-relaxed">
              North Steyne Surf Life Saving Club<br />
              Manly NSW 2095<br /><br />
              Fridays 7:00 AM – 7:45 AM
            </p>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest mb-3 text-[#e4c3cc]">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {[
                { href: "/classes", label: "Classes" },
                { href: "/passes", label: "Passes & Pricing" },
                { href: "/videos", label: "Videos" },
                { href: "/playlists", label: "Playlists" },
                { href: "/auth/login", label: "Log in" },
                { href: "https://www.theamdance.com/s/shop", label: "Shop Merch" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="font-body text-sm text-white/70 hover:text-[#e4c3cc] transition-colors">
                  {label}
                </Link>
              ))}
              <a href="https://theamdance.com" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-white/70 hover:text-[#e4c3cc] transition-colors">
                Website
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-body text-xs text-white/40">
            © {new Date().getFullYear()} THE A.M Dance Club. All rights reserved.
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
