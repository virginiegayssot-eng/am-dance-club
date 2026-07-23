"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

// Implicit flow client — Supabase sends OTP-style link (no PKCE verifier needed)
function resetClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit" } }
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = resetClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fff8f3] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <Image src="/logo-transparent.png" alt="THE A.M Dance Club" width={140} height={100} className="object-contain mx-auto" />
          </Link>
          <h1 className="font-heading text-3xl mb-2">Reset password</h1>
          <p className="font-body text-sm text-gray-500">We'll send you a link to reset it</p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <p className="font-heading text-lg">Check your email</p>
              <p className="font-body text-sm text-gray-500">
                We sent a reset link to <strong>{email}</strong>. Click it to set a new password.
              </p>
              <Link href="/auth/login" className="btn-primary w-full justify-center mt-4 block">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>

              <div className="text-center">
                <Link href="/auth/login" className="font-body text-sm text-gray-500 hover:text-black">
                  ← Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
