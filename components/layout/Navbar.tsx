import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { UserMenu } from "@/components/layout/UserMenu";

export async function Navbar() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string | null; email: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    profile = (data as any) ?? null;
  }

  return (
    <nav className="sticky top-0 z-50 glass border-b border-sand-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="font-display text-xl font-bold text-sand-900 tracking-tight">
            TRVL
          </span>
          <span className="chip bg-ocean/10 text-ocean text-[10px]">beta</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <UserMenu fullName={profile?.full_name ?? null} email={profile?.email ?? user.email ?? null} />
          ) : (
            <Link href="/login" className="btn-secondary text-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
