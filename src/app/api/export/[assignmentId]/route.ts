import { Readable } from "node:stream";
import { type ReadableStream as NodeReadableStream } from "node:stream/web";
import { ZipArchive } from "archiver";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/files";
import type { Assignment, Submission } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(part: string): string {
  return (
    part
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "tugas"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await params;

  // 1) Autentikasi & otorisasi: harus ketua (pembuat) tugas ini.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Belum login", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: assignmentRaw, error: aErr } = await admin
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();

  if (aErr || !assignmentRaw) {
    return new Response("Tugas tidak ditemukan", { status: 404 });
  }
  const assignment = assignmentRaw as Assignment;

  if (assignment.created_by !== user.id) {
    return new Response("Hanya ketua yang boleh mengunduh", { status: 403 });
  }

  // 2) Ambil semua submission.
  const { data: subsRaw } = await admin
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("file_name", { ascending: true });
  const submissions = (subsRaw ?? []) as Submission[];

  if (submissions.length === 0) {
    return new Response("Belum ada tugas yang dikumpulkan", { status: 400 });
  }

  // 3) Susun zip secara streaming.
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const usedNames = new Set<string>();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      archive.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      archive.on("end", () => controller.close());
      archive.on("warning", (err: Error) => console.warn("archiver warning:", err));
      archive.on("error", (err: Error) => controller.error(err));
    },
    cancel() {
      archive.abort();
    },
  });

  // Isi arsip di background (tanpa menunggu) agar respons langsung streaming.
  (async () => {
    try {
      for (const sub of submissions) {
        const { data: signed } = await admin.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(sub.file_path, 120);

        if (!signed?.signedUrl) continue;

        const res = await fetch(signed.signedUrl);
        if (!res.ok || !res.body) continue;

        // Hindari nama duplikat di dalam zip.
        let name = sub.file_name;
        if (usedNames.has(name)) {
          const dot = name.lastIndexOf(".");
          const base = dot === -1 ? name : name.slice(0, dot);
          const ext = dot === -1 ? "" : name.slice(dot);
          name = `${base}_${sub.user_id.slice(0, 4)}${ext}`;
        }
        usedNames.add(name);

        archive.append(Readable.fromWeb(res.body as NodeReadableStream), {
          name,
        });
      }
      await archive.finalize();
    } catch (err) {
      console.error("export error:", err);
      archive.abort();
    }
  })();

  const zipName = `${sanitize(assignment.nama_kelas)}_${sanitize(
    assignment.nama_tugas,
  )}_submissions.zip`;

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
      "Cache-Control": "no-store",
    },
  });
}
