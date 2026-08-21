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

  async function loadUnread(userId: string) {
    // Unread direct messages
    const { count: dmCount } = await supabase
      .from("messages")
      .select("id", { count: "exact" })
      .eq("channel", "direct")
      .eq("recipient_id", userId)
      .is("read_at", null);

    // Unread group messages (since last time user visited /chat group)
    const lastRead = localStorage.getItem("chat_group_last_read");
    let groupCount = 0;
    if (lastRead) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact" })
        .eq("channel", "group")
        .neq("sender_id", userId)
        .gt("created_at", lastRead);
      groupCount = count ?? 0;
    }

    setUnread((dmCount ?? 0) + groupCount);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => {
          setProfile(data);
          loadUnread(user.id);

          // Real-time subscription for new messages
          const ch = supabase.channel("navbar-unread")
            .on("postgres_changes" as any, {
              event: "INSERT",
              schema: "public",
              table: "messages",
            }, () => loadUnread(user.id))
            .on("postgres_changes" as any, {
              event: "UPDATE",
              schema: "public",
              table: "messages",
            }, () => loadUnread(user.id));
          ch.subscribe();
        });
    });
  }, []);

  // Reset unread when visiting chat
  useEffect(() => {
    if (pathname === "/chat") setUnread(0);
  }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href ? "text-[#221f1c]" : "text-black hover:text-[#221f1c]";

  const isInstructor = profile?.role === "instructor";

  const UnreadBadge = ({ small }: { small?: boolean }) => unread > 0 ? (
    <span className={`bg-[#221f1c] text-white font-heading rounded-full flex items-center justify-center ${small ? "text-[10px] w-4 h-4" : "text-xs w-5 h-5"}`}>
      {unread > 9 ? "9+" : unread}
    </span>
  ) : null;

  return (
    <nav className="bg-[#f4efe6] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-end">
          {/* Logo */}
          <Link href={profile ? (isInstructor ? "/instructor" : "/dashboard") : "/"} className="flex-shrink-0 flex items-end pb-0 mr-8">
            <Image src="/logo.png" alt="Sable Studio" width={100} height={70} className="object-contain" />
          </Link>

          <div className="flex-1 flex items-center justify-between border-b border-[#221f1c]/20 pb-3 pt-4">

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/classes" className={`font-body text-sm transition-colors ${isActive("/classes")}`}>Classes</Link>
              <Link href="/instructors" className={`font-body text-sm transition-colors ${isActive("/instructors")}`}>Instructors</Link>
              <Link href="/passes" className={`font-body text-sm transition-colors ${isActive("/passes")}`}>Passes</Link>
              <Link href="/videos" className={`font-body text-sm transition-colors ${isActive("/videos")}`}>Videos</Link>
              <Link href="/merch" className={`font-body text-sm transition-colors ${isActive("/merch")}`}>Merch</Link>
              {profile && (
                <Link href="/playlists" className={`font-body text-sm transition-colors ${isActive("/playlists")}`}>Playlists</Link>
              )}
              {profile && (
                <>
                  <Link href="/chat" className={`font-body text-sm transition-colors relative flex items-center gap-1.5 ${isActive("/chat")}`}>
                    Chat
                    <UnreadBadge small />
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
                  <Link href="/auth/login" className="font-body text-sm text-black hover:text-[#221f1c] transition-colors">Log in</Link>
                  <Link href="/auth/signup" className="btn-primary py-2 px-4 text-xs">Sign up</Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-[#221f1c]/10 relative ml-auto" onClick={() => setMenuOpen(!menuOpen)}>
              <div className="w-5 h-0.5 bg-black mb-1" />
              <div className="w-5 h-0.5 bg-black mb-1" />
              <div className="w-5 h-0.5 bg-black" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 bg-[#221f1c] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-[#221f1c]/20 pt-4">
            {[
              { href: "/classes", label: "Classes" },
              { href: "/instructors", label: "Instructors" },
              { href: "/passes", label: "Passes & Pricing" },
              { href: "/videos", label: "Videos" },
              { href: "/merch", label: "Merch" },
              ...(profile ? [{ href: "/playlists", label: "Playlists" }] : []),
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block font-body text-sm text-black py-2.5 px-1 hover:text-[#221f1c]" onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}

            {profile && (
              <Link href="/chat" className="flex items-center gap-2 font-body text-sm text-black py-2.5 px-1 hover:text-[#221f1c]" onClick={() => setMenuOpen(false)}>
                Chat
                <UnreadBadge />
              </Link>
            )}

            {profile && [
              { href: isInstructor ? "/instructor" : "/dashboard", label: isInstructor ? "Dashboard" : "My Classes" },
              ...(isInstructor ? [{ href: "/reports", label: "Reports" }] : []),
              { href: "/profile", label: "My Profile" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="block font-body text-sm text-black py-2.5 px-1 hover:text-[#221f1c]" onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}

            <div className="pt-3 border-t border-[#221f1c]/20 flex flex-col gap-2">
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
