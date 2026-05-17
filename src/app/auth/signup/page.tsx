"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", birthDate: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });

    if (error) { setError(error.message); setLoading(false); return; }

    // Update profile with phone + birth_date
    if (data.user) {
      await supabase.from("profiles").update({
        full_name: form.fullName,
        phone: form.phone || null,
        birth_date: form.birthDate || null,
      }).eq("id", data.user.id);
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fff8f3] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6">💌</div>
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
    <div className="min-h-screen bg-[#fff8f3] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <span className="font-heading text-2xl text-black">THE A.M</span>
            <span className="block font-body text-xs text-[#2041d8] uppercase tracking-widest">Dance Club</span>
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
              <input type="password" className="input" placeholder="At least 6 characters" minLength={6} value={form.password} onChange={set("password")} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" placeholder="+61 4xx xxx xxx" value={form.phone} onChange={set("phone")} />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.birthDate} onChange={set("birthDate")} />
              <p className="font-body text-xs text-gray-400 mt-1">We'll celebrate your birthday 🎂</p>
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
              <Link href="/auth/login" className="text-[#2041d8] hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
