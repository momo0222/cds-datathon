import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: accounts, error } = await admin
    .from("connected_accounts")
    .select("id,email,expires_at,scopes,created_at,updated_at")
    .eq("user_id", userData.user.id)
    .eq("provider", "gmail")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    connected: (accounts ?? []).length > 0,
    has_gmail_read_scope: (accounts ?? []).some((account: any) =>
      (account.scopes ?? []).includes("https://www.googleapis.com/auth/gmail.readonly")
    ),
    accounts: accounts ?? [],
  });
}
