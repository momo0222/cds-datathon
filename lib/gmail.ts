import { createAdminSupabase } from "@/lib/supabase-admin";
import { decryptToken, encryptToken } from "@/lib/token-crypto";

type ConnectedAccount = {
  id: string;
  user_id: string;
  provider: "gmail";
  email: string | null;
  access_token_enc: string;
  refresh_token_enc: string | null;
  expires_at: string | null;
};

type RefreshTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

export async function getGmailAccount(userId: string, accountId?: string | null) {
  const admin = createAdminSupabase();
  let query = admin
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "gmail");

  if (accountId) {
    query = query.eq("id", accountId);
  }

  const { data, error } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No connected Gmail account found");
  return data as ConnectedAccount;
}

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now() + 60 * 1000;
}

async function refreshAccessToken(account: ConnectedAccount) {
  if (!account.refresh_token_enc) {
    throw new Error("Gmail access expired and no refresh token is stored");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }

  const refreshToken = await decryptToken(account.refresh_token_enc);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const json = (await res.json()) as RefreshTokenResponse;
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "Failed to refresh Gmail token");
  }

  const accessTokenEnc = await encryptToken(json.access_token);
  const expiresAt = json.expires_in
    ? new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  const admin = createAdminSupabase();
  const { error } = await admin
    .from("connected_accounts")
    .update({
      access_token_enc: accessTokenEnc,
      expires_at: expiresAt,
      scopes: json.scope?.split(" ") ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  if (error) throw new Error(error.message);
  return json.access_token;
}

export async function getGmailAccessToken(userId: string, accountId?: string | null) {
  const account = await getGmailAccount(userId, accountId);
  if (isExpiringSoon(account.expires_at)) {
    return refreshAccessToken(account);
  }
  return decryptToken(account.access_token_enc);
}

export async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Gmail API request failed");
  }
  return json as T;
}
