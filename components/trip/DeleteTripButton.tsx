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
      <div className="rounded-sm border border-coral/50 bg-coral-light px-4 py-3">
        <p className="text-sm font-semibold text-amber-dark">Delete {tripName}?</p>
        <p className="mt-1 text-xs text-sand-700">This cannot be undone.</p>
        {error && <p className="mt-2 text-xs font-medium text-amber-dark">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={deleteTrip}
            disabled={deleting}
            className="rounded-sm bg-sand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-sand-800 disabled:opacity-50"
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
      className="rounded-sm border border-coral/50 bg-white px-4 py-2 text-xs font-semibold text-amber-dark hover:bg-coral-light"
    >
      Delete Trip
    </button>
  );
}
