import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { encryptToken } from "@/lib/token-crypto";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
};

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

function redirectWithStatus(request: NextRequest, path: string, status: "connected" | "error") {
  const url = new URL(path, request.url);
  url.searchParams.set("gmail", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getOAuthConfig();
  if (!config) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 501 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get("google_oauth_state")?.value;
  const returnTo = request.cookies.get("google_oauth_return_to")?.value ?? "/dashboard";

  if (error) {
    return redirectWithStatus(request, returnTo, "error");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  let tokenResponse: GoogleTokenResponse;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    tokenResponse = await tokenRes.json();
    if (!tokenRes.ok || !tokenResponse.access_token) {
      return NextResponse.json(
        { error: tokenResponse.error_description ?? tokenResponse.error ?? "Token exchange failed" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Token exchange failed" }, { status: 400 });
  }

  const userInfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokenResponse.access_token}` },
  });
  const userInfo = (await userInfoRes.json().catch(() => ({}))) as GoogleUserInfo;
  if (!userInfoRes.ok || !userInfo.email) {
    return NextResponse.json({ error: "Could not read Google account profile" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: existing } = await admin
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userData.user.id)
    .eq("provider", "gmail")
    .eq("email", userInfo.email)
    .maybeSingle();

  let accessTokenEnc: string;
  let refreshTokenEnc: string | null;
  try {
    accessTokenEnc = await encryptToken(tokenResponse.access_token);
    refreshTokenEnc = tokenResponse.refresh_token
      ? await encryptToken(tokenResponse.refresh_token)
      : existing?.refresh_token_enc ?? null;
  } catch (encryptError) {
    return NextResponse.json(
      { error: encryptError instanceof Error ? encryptError.message : "Token encryption failed" },
      { status: 501 }
    );
  }

  const expiresAt = tokenResponse.expires_in
    ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
    : null;

  const { error: upsertError } = await admin
    .from("connected_accounts")
    .upsert(
      {
        user_id: userData.user.id,
        provider: "gmail",
        provider_account_id: userInfo.sub ?? null,
        email: userInfo.email,
        access_token_enc: accessTokenEnc,
        refresh_token_enc: refreshTokenEnc,
        expires_at: expiresAt,
        scopes: tokenResponse.scope?.split(" ") ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider,email" }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  const response = redirectWithStatus(request, returnTo, "connected");
  response.cookies.delete("google_oauth_state");
  response.cookies.delete("google_oauth_return_to");
  return response;
}
