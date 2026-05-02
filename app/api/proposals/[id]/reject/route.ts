import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { canEdit, getTripRole } from "@/lib/check-role";

export async function POST(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: proposal, error: proposalError } = await admin
    .from("proposed_trip_changes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const role = await getTripRole(proposal.trip_id, userData.user.id);
  if (!canEdit(role)) {
    return NextResponse.json({ error: "Viewers cannot reject proposals" }, { status: 403 });
  }

  if (proposal.status === "approved") {
    return NextResponse.json({ error: "Approved proposals cannot be rejected" }, { status: 409 });
  }

  const { data: rejectedProposal, error: rejectError } = await admin
    .from("proposed_trip_changes")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userData.user.id,
    })
    .eq("id", proposal.id)
    .select("*")
    .single();

  if (rejectError) {
    return NextResponse.json({ error: rejectError.message }, { status: 400 });
  }

  return NextResponse.json({ proposal: rejectedProposal });
}
