"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-sand-900 mb-2">TRVL</h1>
          <p className="text-sand-400 text-sm">Travel planning that gives back time</p>
        </div>

        <div className="card p-8">
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            <div>
              <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@email.com" />
            </div>
            <div>
              <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" />
            </div>
            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-sand-400 mt-5">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-ocean font-semibold hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
