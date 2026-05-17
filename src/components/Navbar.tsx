"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => {
          setProfile(data);
          supabase
            .from("messages")
            .select("id", { count: "exact" })
            .eq("channel", "direct")
            .eq("recipient_id", user.id)
            .is("read_at", null)
            .then(({ count }) => setUnread(count ?? 0));
        });
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href ? "text-[#2041d8]" : "text-black hover:text-[#2041d8]";

  const isInstructor = profile?.role === "instructor";

  return (
    <nav className="bg-[#e4c3cc] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-end">
          {/* Logo — floats above the border line */}
          <Link href="/" className="flex-shrink-0 flex items-end pb-0 mr-8">
            <Image src="/logo.png" alt="THE A.M Dance Club" width={100} height={70} className="object-contain" />
          </Link>

          {/* Nav links with border underneath — only this section gets the border */}
          <div className="flex-1 flex items-center justify-between border-b border-[#2041d8]/20 pb-3 pt-4">

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/classes" className={`font-body text-sm transition-colors ${isActive("/classes")}`}>Classes</Link>
              <Link href="/passes" className={`font-body text-sm transition-colors ${isActive("/passes")}`}>Passes</Link>
              <Link href="/videos" className={`font-body text-sm transition-colors ${isActive("/videos")}`}>Recordings</Link>

              {profile && (
                <>
                  <Link href="/chat" className={`font-body text-sm transition-colors relative ${isActive("/chat")}`}>
                    Chat
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-2 bg-[#2041d8] text-white text-[10px] font-heading w-4 h-4 rounded-full flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                  <Link href={isInstructor ? "/instructor" : "/dashboard"} className={`font-body text-sm transition-colors ${isActive(isInstructor ? "/instructor" : "/dashboard")}`}>
                    {isInstructor ? "Dashboard" : "My Classes"}
                  </Link>
                  {isInstructor && (
                    <Link href="/reports" className={`font-body text-sm transition-colors ${isActive("/reports")}`}>Reports</Link>
                  )}
                </>
              )}
            </div>

            {/* Auth buttons — desktop */}
            <div className="hidden md:flex items-center gap-3 ml-auto">
              {profile ? (
                <>
                  <Link href="/profile" className="text-xs text-gray-600 font-body hover:text-black transition-colors">
                    {profile.full_name?.split(" ")[0] ?? profile.email}
                  </Link>
                  <button onClick={handleSignOut} className="btn-secondary py-1.5 px-3 text-xs">Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="font-body text-sm text-black hover:text-[#2041d8] transition-colors">Log in</Link>
                  <Link href="/auth/signup" className="btn-primary py-2 px-4 text-xs">Sign up</Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-[#2041d8]/10 relative ml-auto" onClick={() => setMenuOpen(!menuOpen)}>
              <div className="w-5 h-0.5 bg-black mb-1" />
              <div className="w-5 h-0.5 bg-black mb-1" />
              <div className="w-5 h-0.5 bg-black" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 bg-[#2041d8] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{unread}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-[#2041d8]/20 pt-4">
            {[
              { href: "/classes", label: "Classes" },
              { href: "/passes", label: "Passes & Pricing" },
              { href: "/videos", label: "Recordings" },
              ...(profile ? [
                { href: "/chat", label: `Chat${unread > 0 ? ` (${unread})` : ""}` },
                { href: isInstructor ? "/instructor" : "/dashboard", label: isInstructor ? "Dashboard" : "My Classes" },
                ...(isInstructor ? [{ href: "/reports", label: "Reports" }] : []),
                { href: "/profile", label: "My Profile" },
              ] : []),
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block font-body text-sm text-black py-2.5 px-1 hover:text-[#2041d8]" onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#2041d8]/20 flex flex-col gap-2">
              {profile ? (
                <button onClick={handleSignOut} className="btn-secondary w-full justify-center py-2 text-xs">Sign out</button>
              ) : (
                <>
                  <Link href="/auth/login" className="btn-secondary w-full justify-center py-2 text-xs" onClick={() => setMenuOpen(false)}>Log in</Link>
                  <Link href="/auth/signup" className="btn-primary w-full justify-center py-2 text-xs" onClick={() => setMenuOpen(false)}>Sign up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
