import { createAdminSupabase } from "@/lib/supabase-admin";

export type TripRole = "owner" | "editor" | "viewer" | null;

export async function getTripRole(tripId: string, userId: string): Promise<TripRole> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .single();

  return (data?.role as TripRole) ?? null;
}

export function canEdit(role: TripRole): boolean {
  return role === "owner" || role === "editor";
}
