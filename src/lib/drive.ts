// Helper Google Drive API (server-only).
// Menggunakan OAuth 2.0 dengan refresh_token yang tersimpan di DB (google_tokens).

import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/files";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

/** Ambil akses token yang masih valid, refresh otomatis bila perlu. */
export async function getAccessToken(): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("google_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data?.refresh_token) {
    throw new Error(
      "Google Drive belum disambungkan. Admin harus setup dulu di /setup-google.",
    );
  }

  const { refresh_token, token_expiry, access_token } = data;

  // Cek apakah masih valid (> 5 menit cadangan).
  if (
    access_token &&
    token_expiry &&
    new Date(token_expiry).getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return access_token;
  }

  // Refresh token.
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum diisi di .env.local");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(
      `Gagal refresh token Google: ${res.status} ${err}. ` +
        "Mungkin token dicabut — ulang setup di /setup-google.",
    );
  }

  const token: TokenResponse = await res.json();
  const expiry = new Date(Date.now() + token.expires_in * 1000).toISOString();

  // Simpan token baru di DB.
  await admin
    .from("google_tokens")
    .update({
      access_token: token.access_token,
      token_expiry: expiry,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return token.access_token;
}

// ---------------------------------------------------------------------------
// Google Drive API
// ---------------------------------------------------------------------------

async function driveFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${DRIVE_API}/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers as Record<string, string>),
    },
  });
}

export type DriveFolder = {
  id: string;
  name: string;
  webViewLink: string;
};

/** Buat folder baru di Drive akun tetap. */
export async function createFolder(
  accessToken: string,
  name: string,
): Promise<DriveFolder> {
  const res = await driveFetch(accessToken, "files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gagal buat folder Drive: ${res.status} ${err}`);
  }

  const folder = await res.json();

  // Set permission "anyone with link can view".
  const permRes = await driveFetch(accessToken, `files/${folder.id}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "anyone", role: "reader" }),
  });

  if (!permRes.ok) {
    const err = await permRes.text().catch(() => "");
    console.warn("Gagal set permission folder:", err);
  }

  // Ambil webViewLink.
  const linkRes = await driveFetch(
    accessToken,
    `files/${folder.id}?fields=webViewLink`,
  );
  const linkData = await linkRes.json();

  return {
    id: folder.id,
    name: folder.name,
    webViewLink: linkData.webViewLink ?? `https://drive.google.com/drive/folders/${folder.id}`,
  };
}

/** Daftar semua file di dalam folder Drive tertentu. */
export async function listFilesInFolder(
  accessToken: string,
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const encoded = encodeURIComponent(`"${folderId}" in parents`);
  const res = await driveFetch(
    accessToken,
    `files?q=${encoded}&fields=files(id,name)&pageSize=1000`,
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gagal list file di folder Drive: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.files ?? [];
}

/** Hapus file atau folder dari Drive. */
export async function deleteFile(
  accessToken: string,
  fileId: string,
): Promise<void> {
  const res = await driveFetch(accessToken, `files/${fileId}`, {
    method: "DELETE",
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gagal hapus file Drive: ${res.status} ${err}`);
  }
}

/** Buat sub-folder di dalam folder Drive. */
export async function createSubFolder(
  accessToken: string,
  parentFolderId: string,
  name: string,
): Promise<{ id: string; webViewLink: string }> {
  const res = await driveFetch(accessToken, "files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gagal buat sub-folder Drive: ${res.status} ${err}`);
  }

  const folder = await res.json();

  // Ambil webViewLink.
  const linkRes = await driveFetch(
    accessToken,
    `files/${folder.id}?fields=webViewLink`,
  );
  const linkData = await linkRes.json();

  return {
    id: folder.id,
    webViewLink: linkData.webViewLink ?? `https://drive.google.com/drive/folders/${folder.id}`,
  };
}

/** Upload file ke folder Drive dari URL (signed URL Supabase). */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileUrl: string,
): Promise<void> {
  // Download dulu dari Supabase.
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) {
    throw new Error(`Gagal download file dari storage: ${fileRes.status}`);
  }

  const fileBuffer = await fileRes.arrayBuffer();
  const contentType =
    fileRes.headers.get("content-type") || "application/octet-stream";

  // Multipart upload binary-safe ke Drive.
  const boundary = `DriveUpload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });

  const encoder = new TextEncoder();

  const body = new Blob([
    encoder.encode(`--${boundary}\r\n`),
    encoder.encode("Content-Type: application/json; charset=UTF-8\r\n\r\n"),
    encoder.encode(metadata),
    encoder.encode(`\r\n--${boundary}\r\n`),
    encoder.encode(`Content-Type: ${contentType}\r\n\r\n`),
    fileBuffer,
    encoder.encode(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await fetch(
    `${UPLOAD_API}/files?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gagal upload "${fileName}" ke Drive: ${res.status} ${err}`);
  }
}

/** Cek apakah Drive sudah disambungkan (ada refresh token valid). */
export async function isDriveConnected(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("google_tokens")
      .select("refresh_token")
      .eq("id", 1)
      .maybeSingle();
    return !!data?.refresh_token;
  } catch {
    return false;
  }
}
