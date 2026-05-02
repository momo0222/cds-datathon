"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Wire up Supabase auth
  // const supabase = createClient();
  // async function handleSignup(e) {
  //   e.preventDefault();
  //   const { error } = await supabase.auth.signUp({
  //     email, password,
  //     options: { data: { full_name: name } }
  //   });
  // }

  const supabase = createClient();
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 px-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-sand-900 mb-2">TRVL</h1>
          <p className="text-sand-400 text-sm">Create your account</p>
        </div>

        <div className="card p-8">
          <form className="flex flex-col gap-4" onSubmit={handleSignup}>
            <div>
              <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@email.com" />
            </div>
            <div>
              <label className="block font-mono text-xs text-sand-400 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Min 8 characters" />
            </div>
            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-sand-400 mt-5">
            Already have an account?{" "}
            <a href="/login" className="text-ocean font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
