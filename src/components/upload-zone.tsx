"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gooeyToast } from "goey-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileCheck2,
  Loader2,
  RefreshCw,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_LABEL,
  STORAGE_BUCKET,
  buildStoragePath,
  buildSubmissionFileName,
  formatFileSize,
  getExtension,
  isAllowedExtension,
  renameKeepExtension,
  stripExtension,
} from "@/lib/files";
import { formatDeadline } from "@/lib/date";
import { deleteKelompokSubmission } from "@/app/actions";
import type { Profile, Submission } from "@/lib/types";

type Props = {
  assignmentId: string;
  profile: Profile;
  initialSubmission: Submission | null;
  isOverdue: boolean;
  uploadedAtLabel: string | null;
  /** Untuk tugas kelompok: hanya perwakilan yang bisa upload, submit ke kelompok_id */
  kelompokId?: string;
  isRepresentative?: boolean;
  /** Untuk tugas kelompok: daftar submission kelompok (agar bisa ditampilkan) */
  kelompokSubmissions?: Submission[];
};

const acceptAttr = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

/** Kirim file via XHR agar dapat progress; pakai JWT user (patuh RLS). */
function uploadWithProgress(
  path: string,
  file: File,
  token: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "3600");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload gagal (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Koneksi terputus saat upload"));
    xhr.send(file);
  });
}

export function UploadZone({
  assignmentId,
  profile,
  initialSubmission,
  isOverdue,
  uploadedAtLabel,
  kelompokId,
  isRepresentative,
  kelompokSubmissions,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [submission, setSubmission] = useState(initialSubmission);
  const [submittedAt, setSubmittedAt] = useState(uploadedAtLabel);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Untuk kelompok: daftar submission yang sudah diupload perwakilan.
  const groupFiles = kelompokSubmissions ?? [];

  // State edit nama file.
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  // State hapus file kelompok (perwakilan).
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isKelompok = !!kelompokId;

  async function handleDeleteFile() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteKelompokSubmission(deleteTarget.id);
    if (!res.ok) {
      gooeyToast.error(res.error);
    } else {
      gooeyToast.success("File dihapus");
      router.refresh();
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  function startEdit() {
    if (!submission) return;
    setNameDraft(stripExtension(submission.file_name));
    setEditing(true);
  }

  async function saveName() {
    if (!submission) return;
    const nextName = renameKeepExtension(submission.file_name, nameDraft);
    if (nextName === submission.file_name) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("submissions")
      .update({ file_name: nextName })
      .eq("id", submission.id)
      .select()
      .single();
    setSavingName(false);

    if (error) {
      gooeyToast.error("Gagal mengganti nama file");
      return;
    }
    setSubmission(data as Submission);
    setEditing(false);
    gooeyToast.success("Nama file diperbarui");
    router.refresh();
  }

  const handleFile = useCallback(
    async (file: File) => {
      if (!isAllowedExtension(file.name)) {
        gooeyToast.error(
          `Tipe .${getExtension(file.name) || "?"} tidak didukung. Hanya: ${ALLOWED_EXTENSIONS.join(", ")}`,
        );
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        gooeyToast.error(
          `File ${formatFileSize(file.size)} melebihi batas ${MAX_FILE_SIZE_LABEL}`,
        );
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        gooeyToast.error("Sesi habis, silakan masuk lagi");
        return;
      }

      const ext = getExtension(file.name);
      // Individu: path stabil per user (nama tampil disimpan terpisah di DB),
      // sehingga rename cukup update DB tanpa memindah file.
      // Kelompok: boleh banyak file, jadi path harus unik per file agar tidak
      // saling menimpa di storage (penting untuk hapus file per-item).
      const path = isKelompok
        ? buildStoragePath(
            assignmentId,
            profile.id,
            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`,
          )
        : buildStoragePath(assignmentId, profile.id, `submission.${ext}`);

      // Nama file: pakai nama asli yang diupload mahasiswa.
      const fileName = submission
        ? renameKeepExtension(file.name, stripExtension(submission.file_name))
        : file.name;

      setUploading(true);
      setProgress(0);

      try {
        await uploadWithProgress(path, file, session.access_token, setProgress);

        // Hapus file lama — hanya untuk individu (kelompok selalu insert baru).
        if (!isKelompok) {
          const oldPath = submission?.file_path ?? null;
          if (oldPath && oldPath !== path) {
            await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]);
          }
        }

        // Simpan submission.
        if (isKelompok) {
          // Kelompok: insert baru (boleh multiple file per kelompok).
          const { data: saved, error } = await supabase
            .from("submissions")
            .insert({
              assignment_id: assignmentId,
              user_id: profile.id,
              kelompok_id: kelompokId,
              file_path: path,
              file_name: fileName,
              file_size: file.size,
              uploaded_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw new Error(error.message);

          setSubmission(saved as Submission);
          setSubmittedAt(formatDeadline((saved as Submission).uploaded_at));
          gooeyToast.success("File berhasil diupload ke kelompok!");
          router.refresh();
        } else {
          // Individu: update atau insert (partial unique index gak support upsert).
          const existingId = submission?.id;
          if (existingId) {
            const { data: saved, error } = await supabase
              .from("submissions")
              .update({
                file_path: path,
                file_name: fileName,
                file_size: file.size,
                uploaded_at: new Date().toISOString(),
              })
              .eq("id", existingId)
              .select()
              .single();

            if (error) throw new Error(error.message);
            setSubmission(saved as Submission);
            setSubmittedAt(formatDeadline((saved as Submission).uploaded_at));
          } else {
            const { data: saved, error } = await supabase
              .from("submissions")
              .insert({
                assignment_id: assignmentId,
                user_id: profile.id,
                file_path: path,
                file_name: fileName,
                file_size: file.size,
                uploaded_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (error) throw new Error(error.message);
            setSubmission(saved as Submission);
            setSubmittedAt(formatDeadline((saved as Submission).uploaded_at));
          }

          gooeyToast.success(
            existingId ? "Tugas berhasil diperbarui!" : "Tugas berhasil dikumpulkan!",
          );
          router.refresh();
        }
      } catch (err) {
        gooeyToast.error(err instanceof Error ? err.message : "Upload gagal");
      } finally {
        setUploading(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [assignmentId, profile, submission, router, isKelompok, kelompokId],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {isKelompok ? "Tugas kelompok" : "Tugas kamu"}
        </h2>
        {!isKelompok && submission && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <FileCheck2 className="size-3.5" /> Sudah dikumpulkan
          </span>
        )}
        {isKelompok && groupFiles.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <FileCheck2 className="size-3.5" /> {groupFiles.length} file
          </span>
        )}
      </div>

      {/* Kelompok: cek apakah user adalah perwakilan */}
      {isKelompok && !isRepresentative ? (
        <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          Hanya perwakilan kelompok yang bisa mengupload file.
        </div>
      ) : null}

      {/* Kartu status submission */}
      <AnimatePresence>
        {isKelompok && groupFiles.length > 0 && !uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2 overflow-hidden"
          >
            {groupFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileCheck2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.file_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {f.file_size ? formatFileSize(f.file_size) : ""}
                    {f.uploaded_at ? ` · ${formatDeadline(f.uploaded_at)}` : ""}
                  </p>
                </div>
                {isRepresentative && (
                  <button
                    onClick={() => setDeleteTarget(f)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                    title="Hapus file"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {!isKelompok && submission && !uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileCheck2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setEditing(false);
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0"
                      onClick={saveName}
                      disabled={savingName}
                    >
                      {savingName ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0"
                      onClick={() => setEditing(false)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">
                      {submission.file_name}
                    </p>
                    <button
                      onClick={startEdit}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      title="Ganti nama file"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatFileSize(submission.file_size)}
                  {submittedAt ? ` · ${submittedAt}` : ""}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar saat upload */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-xl border bg-muted/40 p-4"
          >
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 font-medium">
                <Loader2 className="size-4 animate-spin" /> Mengunggah...
              </span>
              <span className="tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropzone — sembunyikan untuk non-rep */}
      {!uploading && (!isKelompok || isRepresentative) && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={cn(
            `mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors`,
            dragging
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50 hover:bg-muted/40",
          )}
        >
          <motion.div
            animate={{ scale: dragging ? 1.1 : 1, y: dragging ? -2 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          >
            <UploadCloud className="size-6" />
          </motion.div>
          <p className="mt-3 text-sm font-medium">
            {isKelompok
              ? "Seret file ke sini atau"
              : submission
                ? "Ganti file — seret ke sini atau"
                : "Seret file ke sini atau"}{" "}
            <span className="text-primary">pilih file</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ALLOWED_EXTENSIONS.join(", ")} · maks {MAX_FILE_SIZE_LABEL}
          </p>

          <input
            ref={inputRef}
            type="file"
            accept={acceptAttr}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {submission && !uploading && !isKelompok && (
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() => inputRef.current?.click()}
        >
          <RefreshCw /> Upload ulang (ganti file)
        </Button>
      )}

      {isOverdue && (
        <p className="mt-3 text-center text-xs text-amber-600 dark:text-amber-400">
          Deadline sudah lewat — kamu masih bisa upload, tapi mungkin dianggap
          terlambat oleh ketua/dosen.
        </p>
      )}

      {/* Konfirmasi hapus file kelompok */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus file ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.file_name} akan dihapus permanen dari kelompok.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeleteFile}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
