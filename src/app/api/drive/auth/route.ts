import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * GET /api/drive/auth
 *
 * Mengarahkan admin ke Google OAuth consent screen.
 * Scope: drive.file — akses terbatas ke file yang dibuat oleh app ini.
 */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response(
      "GOOGLE_CLIENT_ID belum diisi di .env.local. Lihat SETUP.md.",
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/drive/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent", // paksa dapat refresh_token setiap kali
  });

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
