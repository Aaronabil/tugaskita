import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAccessToken,
  createFolder,
  createSubFolder,
  uploadFileToDrive,
  listFilesInFolder,
  deleteFile,
} from "@/lib/drive";
import { STORAGE_BUCKET } from "@/lib/files";
import type { Assignment, Submission, AssignmentKelompok } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params;
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  // 1) Auth & otorisasi — harus ketua.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Belum login" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: assignmentRaw } = await admin
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignmentRaw) {
    return Response.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }
  const assignment = assignmentRaw as Assignment;

  if (assignment.created_by !== user.id) {
    return Response.json(
      { error: "Hanya ketua yang bisa generate link Drive" },
      { status: 403 },
    );
  }

  // 2) Cek kalau sudah pernah digenerate & tidak dipaksa ulang → balikin link lama.
  if (assignment.gdrive_link && !force) {
    return Response.json({ link: assignment.gdrive_link });
  }

  // 3) Ambil semua submission.
  const { data: subsRaw } = await admin
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("file_name", { ascending: true });
  const submissions = (subsRaw ?? []) as Submission[];

  if (submissions.length === 0) {
    return Response.json(
      { error: "Belum ada tugas yang dikumpulkan" },
      { status: 400 },
    );
  }

  // 4) Dapatkan access token Google.
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Gagal connect Google Drive" },
      { status: 400 },
    );
  }

  // 5) Siapkan folder — refresh existing atau buat baru.
  let folderId: string;
  let webViewLink: string;
  const existingFolderId = assignment.gdrive_folder_id;
  const isKelompok = assignment.tipe === "kelompok";

  if (force && existingFolderId) {
    // Refresh: hapus semua sub-folder/file di folder yang sama.
    const existingItems = await listFilesInFolder(accessToken, existingFolderId);
    await Promise.allSettled(
      existingItems.map((f) => deleteFile(accessToken, f.id)),
    );
    folderId = existingFolderId;
    webViewLink = assignment.gdrive_link!;
  } else if (existingFolderId) {
    folderId = existingFolderId;
    webViewLink = assignment.gdrive_link!;
  } else {
    // Belum ada folder → buat baru.
    const folderName = `${assignment.nama_kelas} - ${assignment.nama_tugas}`;
    let folder;
    try {
      folder = await createFolder(accessToken, folderName);
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Gagal buat folder di Drive" },
        { status: 500 },
      );
    }
    folderId = folder.id;
    webViewLink = folder.webViewLink;

    await admin
      .from("assignments")
      .update({
        gdrive_folder_id: folderId,
        gdrive_link: webViewLink,
      })
      .eq("id", assignmentId);
  }

  // 6) Upload — individu atau kelompok.
  const errors: string[] = [];

  if (isKelompok) {
    // Kelompok: buat sub-folder per kelompok, upload file ke sub-folder masing-masing.
    const { data: kelompoks } = await admin
      .from("assignment_kelompok")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("nomor", { ascending: true });

    const allKelompoks = (kelompoks ?? []) as AssignmentKelompok[];

    for (const k of allKelompoks) {
      const kelompokSubs = submissions.filter((s) => s.kelompok_id === k.id);
      if (kelompokSubs.length === 0) continue;

      // Buat sub-folder.
      let subFolderId: string;
      try {
        const sf = await createSubFolder(accessToken, folderId, k.nama_kelompok);
        subFolderId = sf.id;
      } catch (err) {
        errors.push(`${k.nama_kelompok}: gagal buat sub-folder`);
        continue;
      }

      // Upload file kelompok ke sub-folder.
      for (const sub of kelompokSubs) {
        try {
          const { data: signed } = await admin.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(sub.file_path, 300);

          if (!signed?.signedUrl) {
            errors.push(`${sub.file_name}: signed URL gagal`);
            continue;
          }

          await uploadFileToDrive(
            accessToken,
            subFolderId,
            sub.file_name,
            signed.signedUrl,
          );
        } catch (err) {
          errors.push(
            `${sub.file_name}: ${err instanceof Error ? err.message : "unknown"}`,
          );
        }
      }
    }
  } else {
    // Individu: upload semua file flat ke root folder.
    for (const sub of submissions) {
      try {
        const { data: signed } = await admin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(sub.file_path, 300);

        if (!signed?.signedUrl) {
          errors.push(`${sub.file_name}: signed URL gagal`);
          continue;
        }

        await uploadFileToDrive(
          accessToken,
          folderId,
          sub.file_name,
          signed.signedUrl,
        );
      } catch (err) {
        errors.push(
          `${sub.file_name}: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    }
  }

  // 7) Response.
  const body: { link: string; warnings?: string[] } = { link: webViewLink };
  if (errors.length > 0) {
    body.warnings = errors;
  }

  return Response.json(body);
}
