import Link from "next/link";
import Image from "next/image";
import { MERCH_ENABLED } from "@/lib/feature-flags";

export default function Footer() {
  return (
    <footer className="bg-[#000000] text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image src="/logo.png" alt="BYLA" width={90} height={60} className="object-contain mb-4" />
            <p className="font-body text-sm text-white/70 leading-relaxed">
              Reggaeton dance classes in Sydney.<br />
              Beginner to intermediate.
            </p>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest mb-3 text-[#e2d0fb]">Location & Hours</h4>
            <p className="font-body text-sm text-white/70 leading-relaxed">
              <strong>BYLA Alexandria</strong> — Tuesdays 7:30pm<br />
              70 O'Riordan St, Alexandria NSW 2015 (Village Nation, Studio 1)
            </p>
            <p className="font-body text-sm text-white/70 leading-relaxed mt-3">
              <strong>BYLA Manly</strong> — Thursdays 7:00pm<br />
              St. Matthews Church Hall, 1 Darley Road, Manly NSW 2095
            </p>
            <p className="font-body text-sm text-white/70 leading-relaxed mt-3">
              <a href="mailto:hello@byla.fit" className="hover:text-[#e2d0fb] transition-colors">hello@byla.fit</a><br />
              <a
                href="https://instagram.com/byla.dance"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#e2d0fb] transition-colors mt-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" />
                </svg>
                @byla.dance
              </a>
            </p>
          </div>
          <div>
            <h4 className="font-heading text-sm uppercase tracking-widest mb-3 text-[#e2d0fb]">Quick Links</h4>
            <div className="flex flex-col gap-2">
              {[
                { href: "/how-to-use", label: "How to Use" },
                { href: "/classes", label: "Classes" },
                { href: "/instructors", label: "Instructors" },
                { href: "/passes", label: "Passes & Pricing" },
                { href: "/videos", label: "Videos" },
                ...(MERCH_ENABLED ? [{ href: "/merch", label: "Merch" }] : []),
                { href: "/playlists", label: "Playlists" },
                { href: "/auth/login", label: "Log in" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="font-body text-sm text-white/70 hover:text-[#e2d0fb] transition-colors">
                  {label}
                </Link>
              ))}
              <a href="https://www.byla.fit/" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-white/70 hover:text-[#e2d0fb] transition-colors">
                Website
              </a>
              <a
                href="https://instagram.com/byla.dance"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
                className="text-white/70 hover:text-[#e2d0fb] transition-colors"
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
            © {new Date().getFullYear()} BYLA. All rights reserved.
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
