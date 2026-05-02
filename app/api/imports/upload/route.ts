// =============================================================
// POST /api/imports/upload
// Person B — Smart Upload + Extraction
//
// SHELL: accepts a multipart file upload, validates it, and
// returns an empty proposals array. Extraction logic (text,
// PDF, image/AI vision) will be added in the next step.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { ProposedTripChange } from "@/lib/types";

// Allowed MIME types — text/html first (fastest), then PDF, then images.
// Images will need AI vision which comes later.
const ALLOWED_TYPES = [
  "text/plain",
  "text/html",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

// 10 MB cap — large enough for real booking PDFs, small enough to avoid abuse.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Simple UUID check — avoids importing a full validator just for this.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  // --- Auth check ---
  // Same pattern as every other route in this app.
  // Must happen before we touch the file.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse multipart form data ---
  // File uploads come in as multipart/form-data, not JSON.
  // Next.js App Router exposes this via request.formData().
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data" },
      { status: 400 }
    );
  }

  // --- Validate trip_id ---
  // Must be present and a valid UUID so we know which trip to attach proposals to.
  const trip_id = formData.get("trip_id");
  if (!trip_id || typeof trip_id !== "string" || !UUID_REGEX.test(trip_id)) {
    return NextResponse.json(
      { error: "Missing or invalid trip_id" },
      { status: 400 }
    );
  }

  // --- Validate file ---
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Check MIME type against allowlist.
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Accepted: .txt, .html, .pdf, .png, .jpg, .webp`,
      },
      { status: 400 }
    );
  }

  // Reject files over 10 MB.
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 400 }
    );
  }

  // --- SHELL: return empty proposals ---
  // Extraction logic (text/HTML reading, PDF parsing, AI vision for images)
  // will replace this in the next step. Returning the correct shape now so
  // Person C can wire up the review UI against a real endpoint immediately.
  const proposals: ProposedTripChange[] = [];

  return NextResponse.json({ proposals });
}
