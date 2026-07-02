// Konstanta & util file untuk upload/rename submission.

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_FILE_SIZE_LABEL = "25MB";

// Ekstensi yang diizinkan (tanpa titik).
export const ALLOWED_EXTENSIONS = [
  "docx",
  "pdf",
  "pptx",
  "xlsx",
  "zip",
  "rar",
] as const;

export const STORAGE_BUCKET = "tugas";

/** Ambil ekstensi lowercase dari nama file, atau "" bila tak ada. */
export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === filename.length - 1) return "";
  return filename.slice(dot + 1).toLowerCase();
}

export function isAllowedExtension(filename: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(
    getExtension(filename),
  );
}

/**
 * Rapikan potongan teks agar aman jadi nama file:
 * hilangkan aksen, ganti spasi -> "_", buang karakter aneh.
 */
function slugPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // buang diakritik (aksen)
    .replace(/[^a-zA-Z0-9]+/g, "_") // non-alnum -> underscore
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Bentuk nama file akhir: {NIM}_{Nama}.{ext} */
export function buildSubmissionFileName(
  nim: string,
  nama: string,
  originalName: string,
): string {
  const ext = getExtension(originalName);
  const clean = `${slugPart(nim)}_${slugPart(nama)}`;
  return ext ? `${clean}.${ext}` : clean;
}

/** Path storage: {assignment_id}/{user_id}/{filename} */
export function buildStoragePath(
  assignmentId: string,
  userId: string,
  fileName: string,
): string {
  return `${assignmentId}/${userId}/${fileName}`;
}

/** Ambil nama tanpa ekstensi (untuk field edit rename). */
export function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? filename : filename.slice(0, dot);
}

/**
 * Bentuk ulang nama file dari input mahasiswa, dengan ekstensi asli dikunci.
 * Nama dirapikan agar aman (spasi/karakter aneh -> underscore).
 */
export function renameKeepExtension(
  currentFileName: string,
  newBaseRaw: string,
): string {
  const ext = getExtension(currentFileName);
  const clean = slugPart(newBaseRaw);
  const base = clean || stripExtension(currentFileName) || "tugas";
  return ext ? `${base}.${ext}` : base;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
