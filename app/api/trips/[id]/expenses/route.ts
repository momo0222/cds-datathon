import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { getTripRole, canEdit } from "@/lib/check-role";

const createExpenseSchema = z.object({
  category: z.enum(["flight", "hotel", "transport", "food", "activity", "shopping", "other"]),
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  date: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabase();

  const [{ data: expenses }, { data: trip }, { data: items }] = await Promise.all([
    admin.from("expenses").select("*").eq("trip_id", params.id).order("date", { ascending: false }),
    admin.from("trips").select("total_budget, currency").eq("id", params.id).single(),
    admin.from("itinerary_items").select("cost, currency, type, title").eq("trip_id", params.id),
  ]);

  return NextResponse.json({
    expenses: expenses ?? [],
    trip_budget: trip?.total_budget ?? 0,
    currency: trip?.currency ?? "USD",
    item_costs: items ?? [],
  });
}

export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getTripRole(params.id, userData.user.id);
  if (!canEdit(role)) return NextResponse.json({ error: "Viewers cannot add expenses" }, { status: 403 });

  const json = await request.json().catch(() => null);
  const parsed = createExpenseSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminSupabase();
  const { data: expense, error } = await admin
    .from("expenses")
    .insert({
      trip_id: params.id,
      ...parsed.data,
      paid_by: userData.user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ expense }, { status: 201 });
}
