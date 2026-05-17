"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", birth_date: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
    setForm({
      full_name: data?.full_name ?? "",
      phone: data?.phone ?? "",
      birth_date: (data as any)?.birth_date ?? "",
    });
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("profiles").update({
      full_name: form.full_name,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
    }).eq("id", profile!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff8f3]">
      <div className="font-body text-gray-400">Loading…</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#2041d8] mb-2">Account</p>
          <h1 className="section-title">My Profile</h1>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" value={form.full_name} onChange={set("full_name")} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={profile?.email ?? ""} disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
              <p className="font-body text-xs text-gray-400 mt-1">Email cannot be changed here</p>
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" placeholder="+61 4xx xxx xxx" value={form.phone} onChange={set("phone")} />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.birth_date} onChange={set("birth_date")} />
              <p className="font-body text-xs text-gray-400 mt-1">We'll celebrate your birthday 🎂</p>
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-body px-4 py-3 rounded-xl">
                Profile saved!
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
