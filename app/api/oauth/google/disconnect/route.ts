import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const accountId = typeof body.account_id === "string" ? body.account_id : null;
  const admin = createAdminSupabase();

  let query = admin
    .from("connected_accounts")
    .delete()
    .eq("user_id", userData.user.id)
    .eq("provider", "gmail");

  if (accountId) {
    query = query.eq("id", accountId);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
