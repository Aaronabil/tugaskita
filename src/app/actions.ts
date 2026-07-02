"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa I,O,0,1,L

function genInviteCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Buat tugas baru; pembuat otomatis jadi ketua + anggota. */
export async function createAssignment(input: {
  nama_kelas: string;
  nama_tugas: string;
  deskripsi: string;
  deadline: string; // ISO string atau ""
  tipe: "individu" | "kelompok";
  jumlah_kelompok: number;
  ketua_kelompok: number;
}): Promise<ActionResult<{ id: string; invite_code: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Belum login" };

  const nama_kelas = input.nama_kelas.trim();
  const nama_tugas = input.nama_tugas.trim();
  if (!nama_kelas || !nama_tugas) {
    return { ok: false, error: "Nama kelas dan nama tugas wajib diisi" };
  }

  if (input.tipe === "kelompok" && input.jumlah_kelompok < 1) {
    return { ok: false, error: "Jumlah kelompok minimal 1" };
  }

  // Coba beberapa kali kalau invite_code kebetulan bentrok.
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite_code = genInviteCode();
    const { data, error } = await supabase
      .from("assignments")
      .insert({
        nama_kelas,
        nama_tugas,
        deskripsi: input.deskripsi.trim() || null,
        deadline: input.deadline || null,
        invite_code,
        created_by: user.id,
        tipe: input.tipe,
        jumlah_kelompok: input.tipe === "kelompok" ? input.jumlah_kelompok : null,
      })
      .select("id, invite_code, tipe")
      .single();

    if (!error && data) {
      // Daftarkan pembuat sebagai anggota.
      await supabase
        .from("assignment_members")
        .insert({ assignment_id: data.id, user_id: user.id });

      // Kalau kelompok, auto-generate kelompok & masukin ketua ke kelompok pilihannya.
      if (data.tipe === "kelompok") {
        const rows = Array.from({ length: input.jumlah_kelompok }, (_, i) => ({
          assignment_id: data.id,
          nama_kelompok: `Kelompok ${i + 1}`,
          nomor: i + 1,
        }));
        const { data: kelompoks } = await supabase
          .from("assignment_kelompok")
          .insert(rows)
          .select("id, nomor");

        // Masukin ketua ke kelompok yang dipilih sebagai perwakilan.
        const kelompokKetua = kelompoks?.find(
          (k) => k.nomor === input.ketua_kelompok,
        );
        if (kelompokKetua) {
          await supabase.from("kelompok_members").insert({
            kelompok_id: kelompokKetua.id,
            user_id: user.id,
            is_representative: true,
          });
        }
      }

      revalidatePath("/dashboard");
      return { ok: true, data };
    }

    // 23505 = unique_violation. Kalau bukan itu, hentikan.
    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
    // Kalau bentrok pada kolom lain (mis. NIM) — hentikan juga.
    if (error && !error.message.toLowerCase().includes("invite_code")) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: false, error: "Gagal membuat kode undangan, coba lagi" };
}

/** Gabung ke tugas via invite code. */
export async function joinAssignment(
  codeRaw: string,
): Promise<
  ActionResult<{ id: string; tipe: "individu" | "kelompok"; telah_memilih_kelompok: boolean }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Belum login" };

  const code = codeRaw.trim().toUpperCase();
  if (code.length !== 8) {
    return { ok: false, error: "Kode undangan harus 8 karakter" };
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, tipe")
    .eq("invite_code", code)
    .maybeSingle();

  if (!assignment) {
    return { ok: false, error: "Kode undangan tidak ditemukan" };
  }

  // Individu: langsung join.
  if (assignment.tipe === "individu") {
    const { error } = await supabase
      .from("assignment_members")
      .insert({ assignment_id: assignment.id, user_id: user.id });

    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { ok: true, data: { id: assignment.id, tipe: "individu", telah_memilih_kelompok: true } };
  }

  // Kelompok: cek apakah user sudah punya kelompok.
  const { data: semuaKelompok } = await supabase
    .from("assignment_kelompok")
    .select("id")
    .eq("assignment_id", assignment.id);
  const kelompokIds = (semuaKelompok ?? []).map((k) => k.id);

  if (kelompokIds.length > 0) {
    const { data: existing } = await supabase
      .from("kelompok_members")
      .select("kelompok_id")
      .in("kelompok_id", kelompokIds)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Sudah punya kelompok, join assignment member kalau belum.
      await supabase
        .from("assignment_members")
        .insert({ assignment_id: assignment.id, user_id: user.id });

      revalidatePath("/dashboard");
      return {
        ok: true,
        data: { id: assignment.id, tipe: "kelompok", telah_memilih_kelompok: true },
      };
    }
  }

  return {
    ok: true,
    data: { id: assignment.id, tipe: "kelompok", telah_memilih_kelompok: false },
  };
}

/** Ambil daftar kelompok untuk assignment tertentu. */
export async function getKelompokList(
  assignmentId: string,
): Promise<ActionResult<{ id: string; nama_kelompok: string; nomor: number; anggota_count: number }[]>> {
  const supabase = await createClient();

  const { data: kelompok } = await supabase
    .from("assignment_kelompok")
    .select("id, nama_kelompok, nomor")
    .eq("assignment_id", assignmentId)
    .order("nomor", { ascending: true });

  if (!kelompok) return { ok: false, error: "Gagal memuat kelompok" };

  // Hitung anggota per kelompok.
  const { data: members } = await supabase
    .from("kelompok_members")
    .select("kelompok_id")
    .in("kelompok_id", kelompok.map((k) => k.id));

  const counts = new Map<string, number>();
  members?.forEach((m) => {
    counts.set(m.kelompok_id, (counts.get(m.kelompok_id) || 0) + 1);
  });

  const data = kelompok.map((k) => ({
    ...k,
    anggota_count: counts.get(k.id) || 0,
  }));

  return { ok: true, data };
}

/** Gabung ke kelompok tertentu. */
export async function joinKelompok(
  assignmentId: string,
  kelompokId: string,
): Promise<ActionResult<{ assignment_id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Belum login" };

  // Cek apakah user sudah punya kelompok di assignment ini.
  const { data: semuaKelompok } = await supabase
    .from("assignment_kelompok")
    .select("id")
    .eq("assignment_id", assignmentId);
  const kelompokIds = (semuaKelompok ?? []).map((k) => k.id);

  const { data: existing } = kelompokIds.length > 0
    ? await supabase
        .from("kelompok_members")
        .select("id")
        .in("kelompok_id", kelompokIds)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (existing) {
    return { ok: false, error: "Kamu sudah bergabung di kelompok lain" };
  }

  // Cek apakah user sudah jadi member assignment ini.
  const { data: isMember } = await supabase
    .from("assignment_members")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Cek apakah sudah ada anggota di kelompok ini.
  const { count } = await supabase
    .from("kelompok_members")
    .select("*", { count: "exact", head: true })
    .eq("kelompok_id", kelompokId);

  const isFirstMember = count === 0;

  // Gabung ke kelompok.
  const { error } = await supabase.from("kelompok_members").insert({
    kelompok_id: kelompokId,
    user_id: user.id,
    is_representative: isFirstMember,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Pastikan juga jadi assignment member.
  if (!isMember) {
    await supabase
      .from("assignment_members")
      .insert({ assignment_id: assignmentId, user_id: user.id });
  }

  revalidatePath("/dashboard");
  return { ok: true, data: { assignment_id: assignmentId } };
}

/** Hapus assignment beserta semua data terkait (submissions, members, kelompok). */
export async function deleteAssignment(
  assignmentId: string,
): Promise<ActionResult<{ deleted: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Belum login" };

  // Cek ketua.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("created_by")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) return { ok: false, error: "Tugas tidak ditemukan" };
  if (assignment.created_by !== user.id) {
    return { ok: false, error: "Hanya ketua yang bisa menghapus tugas" };
  }

  // Hapus — cascade akan membersihkan submissions, members, kelompok dll.
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard");
  return { ok: true, data: { deleted: true } };
}
