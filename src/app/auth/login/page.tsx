"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    router.push(profile?.role === "instructor" ? "/instructor" : "/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#fff8f3] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <span className="font-heading text-2xl text-black">THE A.M</span>
            <span className="block font-body text-xs text-[#2041d8] uppercase tracking-widest">Dance Club</span>
          </Link>
          <h1 className="font-heading text-3xl mb-2">Welcome back</h1>
          <p className="font-body text-sm text-gray-500">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body text-sm text-gray-500">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-[#2041d8] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
