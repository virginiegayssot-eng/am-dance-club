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
  const [form, setForm] = useState({ full_name: "", phone: "", birth_month: "", birth_day: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data);
    const bd = (data as any)?.birth_date ?? "";
    // DB stores 2000-MM-DD; extract only month and day
    const parts = bd ? bd.split("-") : [];
    const [bMonth, bDay] = parts.length === 3 ? [parts[1], parts[2]] : parts.length === 2 ? parts : ["", ""];
    setForm({
      full_name: data?.full_name ?? "",
      phone: data?.phone ?? "",
      birth_month: bMonth ? String(parseInt(bMonth)) : "",
      birth_day: bDay ? String(parseInt(bDay)) : "",
    });
    setAvatarUrl(data?.avatar_url ?? null);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const birth_date = form.birth_month && form.birth_day
      ? `${form.birth_month.padStart(2,"0")}-${form.birth_day.padStart(2,"0")}`
      : null;
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: form.full_name, phone: form.phone, birth_date }),
    });
    const { error } = await res.json();
    setSaving(false);
    if (error) { setSaveError(error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true);
    setAvatarError("");

    try {
      // Get base64 via FileReader first (most compatible)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(new Error("FileReader failed"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      });

      if (!res.ok) { setAvatarError("Upload failed, please try again."); setUploadingAvatar(false); return; }
      const json = await res.json();
      if (json.error) { setAvatarError("Upload failed: " + json.error); setUploadingAvatar(false); return; }

      setAvatarUrl(json.url + "?t=" + Date.now());
    } catch (err: any) {
      setAvatarError("Caught error: " + (err?.message ?? String(err)));
    }
    setUploadingAvatar(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbf8f4]">
      <div className="font-body text-gray-400">Loading…</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-[#7d6653] mb-2">Account</p>
          <h1 className="section-title">My Profile</h1>
        </div>

        <div className="card p-8">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#f0e8dd]/50 mb-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-heading text-3xl text-[#7d6653]">
                  {(form.full_name || profile?.email || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
            <label className="cursor-pointer font-body text-sm text-[#7d6653] hover:underline">
              {uploadingAvatar ? "Uploading…" : "Change photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
            {avatarError && <p className="font-body text-xs text-red-500 mt-1 text-center">{avatarError}</p>}
          </div>

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
              <label className="label">Phone *</label>
              <input type="tel" className="input" placeholder="+61 4xx xxx xxx" value={form.phone} onChange={set("phone")} required />
            </div>
            <div>
              <label className="label">Birthday *</label>
              <div className="flex gap-2">
                <select className="input flex-1" value={form.birth_month} onChange={e => setForm(f => ({ ...f, birth_month: e.target.value }))} required>
                  <option value="">Month</option>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <select className="input w-28" value={form.birth_day} onChange={e => setForm(f => ({ ...f, birth_day: e.target.value }))} required>
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-body px-4 py-3 rounded-xl">
                Profile saved!
              </div>
            )}
            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">
                {saveError}
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
