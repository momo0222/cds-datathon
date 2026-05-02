"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  tripId: string;
  tripName: string;
}

export function DeleteTripButton({ tripId, tripName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteTrip() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Could not delete trip.");
        setDeleting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while deleting trip.");
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
        <p className="text-sm font-semibold text-red-700">Delete {tripName}?</p>
        <p className="mt-1 text-xs text-red-600">This cannot be undone.</p>
        {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={deleteTrip}
            disabled={deleting}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete trip"}
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={deleting}
            className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-xl border border-red-100 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
    >
      Delete Trip
    </button>
  );
}
