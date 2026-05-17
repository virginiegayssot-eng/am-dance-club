"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import type { Video } from "@/lib/supabase";

export default function VideosPage() {
  const supabase = createClient();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    const { data } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    setVideos(data ?? []);
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Watch anytime</p>
          <h1 className="section-title mb-3">Class Recordings</h1>
          <p className="font-body text-gray-500">
            Missed a Friday? Catch up with recordings from past sessions.
          </p>
        </div>

        {!isLoggedIn && (
          <div className="bg-[#a3bdfe]/20 border border-[#a3bdfe] rounded-2xl p-5 mb-8 font-body text-sm flex items-center gap-3">
            <span>🔐</span>
            <span>
              Some recordings are for registered students only.{" "}
              <a href="/auth/login" className="text-[#2041d8] underline">Log in</a> to access all videos.
            </span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-video bg-gray-100" />
                <div className="p-4">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="font-heading text-xl mb-2">No recordings yet</h3>
            <p className="font-body text-gray-500">Check back after your first class!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((v) => (
              <div key={v.id} className="card overflow-hidden group">
                <div className="relative aspect-video bg-black">
                  {playing === v.id ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${v.youtube_id}?autoplay=1`}
                      title={v.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      <img
                        src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <button
                        onClick={() => setPlaying(v.id)}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="w-14 h-14 bg-white/90 group-hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
                          <div className="w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[16px] border-l-[#2041d8] ml-1" />
                        </div>
                      </button>
                    </>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-heading text-sm mb-1">{v.title}</h3>
                  {v.description && (
                    <p className="font-body text-xs text-gray-500 line-clamp-2 mb-3">{v.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-gray-400">
                      {new Date(v.created_at).toLocaleDateString("en-AU", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </span>
                    <a
                      href={v.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-xs text-[#2041d8] hover:underline"
                    >
                      Watch on YouTube ↗
                    </a>
                  </div>
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
