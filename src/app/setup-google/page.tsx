import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink, ShieldAlert } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { isDriveConnected } from "@/lib/drive";

export default async function SetupGooglePage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const connected = await isDriveConnected();

  // Hanya ketua (pernah bikin kelas) yang boleh setup Drive.
  const { count } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("created_by", profile.id);

  const isKetua = (count ?? 0) > 0;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar profile={profile} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali
        </Link>

        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-bold tracking-tight">Google Drive</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hubungkan satu akun Google sebagai penyimpanan tetap semua file tugas.
            Hanya ketua kelas yang bisa melakukan setup ini.
          </p>

          {/* Status */}
          <div className="mt-5 flex items-center gap-3 rounded-xl border p-4">
            {connected ? (
              <CheckCircle2 className="size-6 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="size-6 shrink-0 text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium">
                {connected ? "Google Drive tersambung" : "Belum tersambung"}
              </p>
              <p className="text-xs text-muted-foreground">
                {connected
                  ? "Akun Google sudah terhubung. Ketua kelas bisa generate link Drive di halaman tugas."
                  : "Belum ada akun Google yang terhubung."}
              </p>
            </div>
          </div>

          {/* Tombol connect — hanya untuk ketua */}
          {isKetua ? (
            <div className="mt-5">
              {connected ? (
                <Button className="w-full" variant="outline" asChild>
                  <a href="/api/drive/auth">Sambungkan Ulang (Ganti Akun)</a>
                </Button>
              ) : (
                <Button className="w-full" asChild>
                  <a href="/api/drive/auth">Sambungkan Google Drive</a>
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <ShieldAlert className="size-5 shrink-0" />
              <span>
                Hanya ketua kelas yang bisa menyambungkan Google Drive. Kamu
                anggota — tidak perlu setup apa pun.
              </span>
            </div>
          )}

          {/* Panduan — hanya untuk ketua */}
          {isKetua && (
            <div className="mt-5 space-y-3 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Panduan Setup Google Cloud</p>
              <ol className="list-inside list-decimal space-y-2">
                <li>
                  Buka{" "}
                  <a
                    href="https://console.cloud.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    Google Cloud Console <ExternalLink className="size-3" />
                  </a>
                </li>
                <li>Buat project baru (atau pilih existing)</li>
                <li>
                  Buka APIs &amp; Services → Enable{" "}
                  <strong>Google Drive API</strong>
                </li>
                <li>
                  Buka Credentials → Create Credentials →{" "}
                  <strong>OAuth client ID</strong>
                </li>
                <li>
                  Application type: <strong>Web application</strong>
                </li>
                <li>
                  Authorized redirect URIs: tambahkan{" "}
                  <code className="inline-block break-all rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                    {process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}
                    /api/drive/callback
                  </code>
                </li>
                <li>
                  Salin <strong>Client ID</strong> dan{" "}
                  <strong>Client Secret</strong> ke .env.local
                </li>
                <li>Klik tombol Sambungkan di atas</li>
              </ol>
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <strong>Catatan:</strong> Akun Google ini akan menyimpan semua
                file tugas. Pastikan storage-nya mencukupi (15GB gratis per
                akun). File berada di folder sesuai nama kelas dan tugas di Drive
                akun ini.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
