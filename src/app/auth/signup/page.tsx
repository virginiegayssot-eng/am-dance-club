"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Mail } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", birthMonth: "", birthDay: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\+?[\d\s\-]{8,15}$/.test(form.phone.trim())) { setError("Please enter a valid phone number."); return; }
    if (!form.birthMonth || !form.birthDay) { setError("Birthday is required."); return; }

    setLoading(true);

    const birthDate = `2000-${form.birthMonth.padStart(2,"0")}-${form.birthDay.padStart(2,"0")}`;

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, phone: form.phone, birth_date: birthDate },
        emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) { setError(error.message); setLoading(false); return; }

    // Also try updating profile directly (belt and suspenders)
    if (data.user) {
      await supabase.from("profiles").update({
        full_name: form.fullName,
        phone: form.phone,
        birth_date: birthDate,
      }).eq("id", data.user.id);
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Mail className="w-14 h-14 mx-auto mb-6 text-[#000000]" strokeWidth={1.5} />
          <h2 className="font-heading text-2xl mb-3">Check your email!</h2>
          <p className="font-body text-gray-500 mb-6">
            We've sent a confirmation link to <strong>{form.email}</strong>.<br />
            Click the link to activate your account.
          </p>
          <Link href="/auth/login" className="btn-primary">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ffffff] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <Image src="/logo-transparent.png" alt="BYLA" width={140} height={100} className="object-contain mx-auto" />
          </Link>
          <h1 className="font-heading text-3xl mb-2">Join the club</h1>
          <p className="font-body text-sm text-gray-500">Create your account to book classes</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="label">Full Name *</label>
              <input type="text" className="input" placeholder="Jane Smith" value={form.fullName} onChange={set("fullName")} required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={set("email")} required />
            </div>
            <div>
              <label className="label">Password *</label>
              <PasswordInput className="input" placeholder="At least 6 characters" minLength={6} value={form.password} onChange={set("password")} required />
            </div>
            <div>
              <label className="label">Phone *</label>
              <input type="tel" className="input" placeholder="+61 4xx xxx xxx" value={form.phone} onChange={set("phone")} required />
            </div>
            <div>
              <label className="label">Birthday *</label>
              <div className="flex gap-2">
                <select className="input flex-1" value={form.birthMonth} onChange={e => setForm(f => ({ ...f, birthMonth: e.target.value }))} required>
                  <option value="">Month</option>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <select className="input w-28" value={form.birthDay} onChange={e => setForm(f => ({ ...f, birthDay: e.target.value }))} required>
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#000000] hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
