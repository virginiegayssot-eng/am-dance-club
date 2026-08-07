"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import type { Playlist } from "@/lib/supabase";
import { Music } from "lucide-react";

function getSpotifyId(url: string): string | null {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default function PlaylistsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPlaylists(); }, []);

  async function loadPlaylists() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data } = await supabase
      .from("playlists")
      .select("*")
      .order("created_at", { ascending: false });

    setPlaylists(data ?? []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-body text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-2">Members only</p>
          <h1 className="section-title mb-3">Class Playlists</h1>
          <p className="font-body text-gray-500">
            The music we dance to. Your Friday soundtrack starts here.
          </p>
        </div>

        {playlists.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-12 h-12 mx-auto mb-4 text-[#000000]" strokeWidth={1.5} />
            <h3 className="font-heading text-xl mb-2">No playlists yet</h3>
            <p className="font-body text-gray-500">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {playlists.map((p) => (
              <div key={p.id} className="card overflow-hidden">
                <iframe
                  src={`https://open.spotify.com/embed/playlist/${p.spotify_id}?utm_source=generator&theme=0`}
                  width="100%"
                  height="352"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="border-0"
                />
                <div className="p-5">
                  <h3 className="font-heading text-base mb-1">{p.title}</h3>
                  {p.description && (
                    <p className="font-body text-sm text-gray-500">{p.description}</p>
                  )}
                  <a
                    href={p.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-xs text-[#1DB954] hover:underline mt-2 inline-block"
                  >
                    Open in Spotify ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
