"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import { GraduationCap } from "lucide-react";

type PublicInstructor = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
};

export default function InstructorsPage() {
  const supabase = createClient();
  const [instructors, setInstructors] = useState<PublicInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedAvatarIds, setFailedAvatarIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInstructors();
  }, []);

  async function loadInstructors() {
    // public_instructors is a view exposing only the columns this page
    // renders — the underlying profiles table has real PII and requires
    // login, so this page can't query it directly. See
    // supabase/fix-public-instructors-page.sql.
    const { data } = await supabase
      .from("public_instructors")
      .select("*")
      .order("full_name");

    setInstructors(data ?? []);
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#221f1c] mb-2">Meet the team</p>
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
            <GraduationCap className="w-10 h-10 text-[#221f1c] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="font-heading text-xl mb-2">No instructors yet</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((inst) => (
              <div key={inst.id} className="card p-6">
                <div className="w-20 h-20 rounded-full bg-[#ddd3c0]/50 overflow-hidden flex items-center justify-center text-2xl font-heading mb-4">
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
                    (inst.full_name ?? "?")[0].toUpperCase()
                  )}
                </div>
                <h3 className="font-heading text-lg mb-0.5">{inst.full_name ?? "Instructor"}</h3>
                {inst.title && (
                  <p className="font-body text-xs uppercase tracking-widest text-[#221f1c] mb-3">{inst.title}</p>
                )}
                {inst.bio && (
                  <p className="font-body text-sm text-black/70 leading-relaxed">{inst.bio}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
