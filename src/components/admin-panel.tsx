"use client";

import { useState } from "react";
import { gooeyToast } from "goey-toast";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  FolderOpen,
  Users,
  FileText,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/files";
import { fadeUp, stagger } from "@/components/motion";
import { deleteAssignment } from "@/app/actions";
import type { Assignment, KelompokProgress, MemberProgress } from "@/lib/types";

type Props = {
  assignmentId: string;
  inviteCode: string;
  progress: MemberProgress[];
  gdriveLink: string | null;
  assignment?: Assignment;
  kelompokProgress?: KelompokProgress[];
};

export function AdminPanel({ assignmentId, inviteCode, progress, gdriveLink, assignment, kelompokProgress }: Props) {
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const driveLink = generatedLink || gdriveLink;

  const isKelompok = assignment?.tipe === "kelompok" && !!kelompokProgress;
  const total = isKelompok ? (kelompokProgress?.length ?? 0) : progress.length;
  const submitted = isKelompok
    ? (kelompokProgress?.filter((kp) => kp.submissions.length > 0).length ?? 0)
    : progress.filter((p) => p.submission).length;
  const pct = total ? Math.round((submitted / total) * 100) : 0;

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    gooeyToast.success("Kode disalin");
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyDriveLink() {
    if (!driveLink) return;
    await navigator.clipboard.writeText(driveLink);
    setLinkCopied(true);
    gooeyToast.success("Link Drive disalin");
    setTimeout(() => setLinkCopied(false), 1500);
  }

  async function generateDriveLink(force = false) {
    if (submitted === 0) {
      gooeyToast.error("Belum ada tugas yang dikumpulkan");
      return;
    }
    setGenerating(true);
    const t = gooeyToast.info("Membuat folder Drive & mengupload file...");
    try {
      const url = `/api/drive/generate-link/${assignmentId}${force ? "?force=true" : ""}`;
      const res = await fetch(url, {
        method: "POST",
      });
      const data = await res.json();
      gooeyToast.dismiss(t);

      if (!res.ok) {
        gooeyToast.error(data.error || "Gagal generate link Drive");
        if (data.error?.includes("belum disambungkan")) {
          gooeyToast.info("Pergi ke menu profil → Google Drive untuk setup");
        }
        return;
      }

      setGeneratedLink(data.link);
      gooeyToast.success("Folder Google Drive berhasil dibuat!");
      if (data.warnings?.length) {
        gooeyToast.warning(
          `${data.warnings.length} file gagal diupload. Coba generate ulang.`,
        );
      }
    } catch (err) {
      gooeyToast.dismiss(t);
      gooeyToast.error(
        err instanceof Error ? err.message : "Gagal generate link Drive",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function downloadZip() {
    if (submitted === 0) {
      gooeyToast.error("Belum ada tugas yang bisa diunduh");
      return;
    }
    setDownloading(true);
    const t = gooeyToast.info("Menyiapkan file zip...");
    try {
      const res = await fetch(`/api/export/${assignmentId}`);
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Gagal mengunduh (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? "submissions.zip";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      gooeyToast.dismiss(t);
      gooeyToast.success("Berhasil diunduh!");
    } catch (err) {
      gooeyToast.dismiss(t);
      gooeyToast.error(err instanceof Error ? err.message : "Gagal mengunduh");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteAssignment(assignmentId);
    // Kalau sampai sini berarti error (redirect sukses ga balik ke sini)
    if (!res.ok) gooeyToast.error(res.error);
    setDeleting(false);
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Progress pengumpulan</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {submitted}/{total}
            </span>{" "}
            {isKelompok ? "kelompok sudah upload" : "sudah upload"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link Google Drive */}
          {driveLink ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={copyDriveLink}>
                {linkCopied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
                Salin Link Drive
              </Button>
              <Button asChild>
                <a
                  href={driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Buka Drive
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateDriveLink(true)}
                disabled={generating || submitted === 0}
              >
                {generating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <FolderOpen className="size-3" />
                )}
                Perbarui
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => generateDriveLink(false)}
              disabled={generating || submitted === 0}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderOpen className="size-4" />
              )}
              {generating ? "Mengupload..." : "Buat Link Google Drive"}
            </Button>
          )}
        </div>
      </div>

      {/* Drive link sudah tergenerate */}
      {driveLink && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950"
        >
          <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Folder Google Drive siap
            </p>
            <a
              href={driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all text-emerald-600 underline hover:text-emerald-500 dark:text-emerald-400"
            >
              {driveLink} <ExternalLink className="size-3 shrink-0" />
            </a>
          </div>
        </motion.div>
      )}

      <div className="mt-4">
        <Progress value={pct} />
      </div>

      {/* Tombol Download ZIP (fallback) */}
      <div className="mt-3 flex items-center justify-end">
        <button
          onClick={downloadZip}
          disabled={downloading || submitted === 0}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Download className="size-3" />
          )}
          {downloading ? "Menyiapkan..." : "Download ZIP (cadangan)"}
        </button>
      </div>

      {/* Invite code */}
      <button
        onClick={copyCode}
        className="group mt-3 flex w-full items-center justify-between rounded-xl border border-dashed bg-muted/30 px-4 py-2.5 text-left transition-colors hover:border-primary/50"
      >
        <span className="text-xs text-muted-foreground">
          Invite code —{" "}
          <span className="font-mono text-sm font-bold tracking-widest text-primary">
            {inviteCode}
          </span>
        </span>
        {copied ? (
          <Check className="size-4 text-emerald-500" />
        ) : (
          <Copy className="size-4 text-muted-foreground group-hover:text-foreground" />
        )}
      </button>

      {/* Daftar progress — kelompok atau individu */}
      {isKelompok && kelompokProgress ? (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-4 space-y-3"
        >
          {kelompokProgress.map((kp) => (
            <motion.div
              key={kp.kelompok.id}
              variants={fadeUp}
              className="rounded-xl border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="font-medium">{kp.kelompok.nama_kelompok}</span>
                </div>
                {kp.submissions.length > 0 ? (
                  <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {kp.submissions.length} file
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-medium text-red-500">
                    Belum upload
                  </span>
                )}
              </div>

              {/* Anggota */}
              <div className="mt-2 text-xs text-muted-foreground">
                {kp.members.length > 0
                  ? kp.members.map((m) => m.nama).join(", ")
                  : "Belum ada anggota"}
              </div>

              {/* Daftar file */}
              {kp.submissions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {kp.submissions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <FileText className="size-3 text-muted-foreground" />
                      <span>{s.file_name}</span>
                      {s.file_size && (
                        <span className="text-muted-foreground">
                          ({formatFileSize(s.file_size)})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-4 divide-y rounded-xl border"
        >
          {progress.map(({ profile, submission }) => (
            <motion.li
              key={profile.id}
              variants={fadeUp}
              className="flex items-center gap-3 px-4 py-3"
            >
              {submission ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="size-5 shrink-0 text-red-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{profile.nama}</p>
                <p className="truncate text-xs text-muted-foreground">
                  NIM {profile.nim}
                  {submission ? ` · ${formatFileSize(submission.file_size)}` : ""}
                </p>
              </div>
              <span
                className={
                  submission
                    ? "shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                    : "shrink-0 text-xs font-medium text-red-500"
                }
              >
                {submission ? "Sudah" : "Belum"}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {/* Hapus kelas (hanya ketua) */}
      <div className="mt-6 border-t pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-red-500 hover:text-red-600"
            >
              <Trash2 className="size-4" />
              Hapus kelas
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus kelas?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua data tugas, file upload, anggota, dan kelompok akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleting ? (
                  <><Loader2 className="size-4 animate-spin" /> Menghapus...</>
                ) : (
                  "Hapus"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
