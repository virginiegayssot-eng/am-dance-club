"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { GraduationCap } from "lucide-react";

export default function InstructorsPage() {
  const supabase = createClient();
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedAvatarIds, setFailedAvatarIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInstructors();
  }, []);

  async function loadInstructors() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "instructor")
      .order("full_name");

    setInstructors(data ?? []);
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#000000] mb-2">Meet the team</p>
          <h1 className="section-title mb-3">Instructors</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="w-20 h-20 rounded-full bg-gray-100 mb-4" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : instructors.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-10 h-10 text-[#000000] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="font-heading text-xl mb-2">No instructors yet</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((inst) => (
              <div key={inst.id} className="card p-6">
                <div className="w-20 h-20 rounded-full bg-[#e2d0fb]/50 overflow-hidden flex items-center justify-center text-2xl font-heading mb-4">
                  {inst.avatar_url && !failedAvatarIds.has(inst.id) ? (
                    <Image
                      src={inst.avatar_url}
                      alt={inst.full_name ?? ""}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                      onError={() => setFailedAvatarIds(prev => new Set(prev).add(inst.id))}
                    />
                  ) : (
                    (inst.full_name ?? inst.email)[0].toUpperCase()
                  )}
                </div>
                <h3 className="font-heading text-lg mb-0.5">{inst.full_name ?? inst.email}</h3>
                {inst.title && (
                  <p className="font-body text-xs uppercase tracking-widest text-[#000000] mb-3">{inst.title}</p>
                )}
                {inst.bio && (
                  <p className="font-body text-sm text-black/70 leading-relaxed">{inst.bio}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card p-6 mt-10 bg-[#e2d0fb] border-none">
          <h2 className="font-heading text-lg mb-2 text-[#000000]">Visiting & Guest Instructors</h2>
          <p className="font-body text-sm text-black/70 leading-relaxed">
            BYLA regularly brings in specialist instructors for workshops and special classes — including Video Shooting sessions. Check the schedule for upcoming guests.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
