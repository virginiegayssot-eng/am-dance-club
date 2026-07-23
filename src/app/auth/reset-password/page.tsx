"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    async function verify() {
      const searchParams = new URLSearchParams(window.location.search);

      // 1. token_hash flow (from admin generateLink)
      const token_hash = searchParams.get("token_hash");
      if (token_hash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: "recovery" });
        if (!error) { setReady(true); return; }
      }

      // 2. Hash-based flow (#access_token=...&type=recovery)
      const hash = window.location.hash.substring(1);
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token") ?? "";
        const type = hashParams.get("type");
        if (access_token && type === "recovery") {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) { setReady(true); return; }
        }
      }

      // 3. PKCE code flow (?code=...)
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) { setReady(true); return; }
      }

      // 4. Existing session (e.g. page refresh)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setReady(true); return; }

      // 5. Listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
      });

      const timer = setTimeout(() => setTimedOut(true), 8000);
      return () => { subscription.unsubscribe(); clearTimeout(timer); };
    }

    verify();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#fff8f3] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <Image src="/logo-transparent.png" alt="THE A.M Dance Club" width={140} height={100} className="object-contain mx-auto" />
          </Link>
          <h1 className="font-heading text-3xl mb-2">New password</h1>
          <p className="font-body text-sm text-gray-500">Choose a new password for your account</p>
        </div>

        <div className="card p-8">
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">New password</label>
                <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input type="password" className="input" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-body px-4 py-3 rounded-xl">{error}</div>
              )}
              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? "Saving…" : "Set new password"}
              </button>
            </form>
          ) : timedOut ? (
            <div className="text-center space-y-4 py-4">
              <p className="font-body text-sm text-red-500">This link has expired or is no longer valid.</p>
              <Link href="/auth/forgot-password" className="btn-primary w-full justify-center block">
                Request a new link
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="font-body text-sm text-gray-500">Verifying your link…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
