import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/drive/callback?code=xxx
 *
 * Google OAuth callback. Menukar authorization code dengan token,
 * lalu menyimpan access + refresh token ke tabel google_tokens.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new Response(
      `OAuth ditolak: ${error}. Kembali dan coba lagi.`,
      { status: 400 },
    );
  }

  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response(
      "GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum diisi di .env.local",
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/drive/callback`;

  // Tukar code dengan token.
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => "");
    return new Response(
      `Gagal tukar code: ${tokenRes.status} ${err}`,
      { status: 400 },
    );
  }

  const token = await tokenRes.json();
  const refreshToken = token.refresh_token;
  const accessToken = token.access_token;
  const expiresIn = token.expires_in; // detik

  if (!refreshToken) {
    return new Response(
      "Tidak mendapat refresh_token. Pastikan prompt=consent terkirim. " +
        "Coba hapus akses app ini di myaccount.google.com/permissions, lalu ulangi.",
      { status: 400 },
    );
  }

  // Simpan ke DB.
  const admin = createAdminClient();
  const { error: dbErr } = await admin.from("google_tokens").upsert(
    {
      id: 1,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (dbErr) {
    return new Response(`Gagal simpan token: ${dbErr.message}`, { status: 500 });
  }

  // Redirect ke halaman sukses.
  redirect("/setup-google?success=1");
}
