"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Props {
  fullName: string | null;
  email: string | null;
}

export function UserMenu({ fullName, email }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = fullName || email || "Account";
  const initial = (displayName.trim()[0] || "?").toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm font-semibold text-sand-700 max-w-[200px] truncate">
          {displayName}
        </span>
        {email && (
          <span className="text-[11px] text-sand-400 max-w-[200px] truncate">
            {email}
          </span>
        )}
      </div>

      <div className="w-8 h-8 rounded-full bg-sand-200 flex items-center justify-center">
        <span className="text-xs font-bold text-sand-600">{initial}</span>
      </div>

      <button
        onClick={handleSignOut}
        disabled={loading}
        className={cn(
          "btn-secondary !px-3 !py-2 text-xs",
          loading && "opacity-60"
        )}
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
