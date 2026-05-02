import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { askAI } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trip_id } = await request.json().catch(() => ({ trip_id: null }));
  if (!trip_id) return NextResponse.json({ error: "trip_id required" }, { status: 400 });

  const admin = createAdminSupabase();

  const [{ data: trip }, { data: expenses }, { data: items }] = await Promise.all([
    admin.from("trips").select("name, destination, start_date, end_date, total_budget, currency").eq("id", trip_id).single(),
    admin.from("expenses").select("category, description, amount, currency, date").eq("trip_id", trip_id),
    admin.from("itinerary_items").select("type, title, cost, currency").eq("trip_id", trip_id),
  ]);

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const totalItemCosts = (items ?? []).reduce((s, i) => s + Number(i.cost), 0);
  const totalSpent = totalExpenses + totalItemCosts;

  const system = `You are a concise travel budget advisor. Analyze the spending data and give 3-5 short, actionable tips. Be specific to this trip. Use bullet points. Keep it under 200 words. If they're under budget, say so positively. If over, flag it clearly.`;

  const prompt = `Trip: ${trip.name} to ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date}
Budget: ${trip.currency} ${trip.total_budget}
Total spent so far: ${trip.currency} ${totalSpent.toFixed(2)}
Remaining: ${trip.currency} ${(trip.total_budget - totalSpent).toFixed(2)}

Expenses breakdown:
${(expenses ?? []).map(e => `- ${e.category}: ${e.currency} ${e.amount} (${e.description})`).join("\n") || "No manual expenses yet."}

Booked item costs:
${(items ?? []).filter(i => Number(i.cost) > 0).map(i => `- ${i.type}: ${i.currency} ${i.cost} (${i.title})`).join("\n") || "No booked items with costs yet."}`;

  try {
    const result = await askAI({ system, prompt, model: "mini", temperature: 0.5, maxTokens: 500 });
    return NextResponse.json({ analysis: result.text, totalSpent, totalBudget: trip.total_budget, currency: trip.currency });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI analysis failed" }, { status: 400 });
  }
}
