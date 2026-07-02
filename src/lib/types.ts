// Tipe data database (dipetakan manual dari supabase/schema.sql).

export type Role = "admin" | "member";

export type Profile = {
  id: string;
  nama: string;
  nim: string;
  role: Role;
  created_at: string;
};

export type Assignment = {
  id: string;
  nama_kelas: string;
  nama_tugas: string;
  deskripsi: string | null;
  deadline: string | null;
  invite_code: string;
  created_by: string;
  tipe: "individu" | "kelompok";
  jumlah_kelompok: number | null;
  gdrive_folder_id: string | null;
  gdrive_link: string | null;
  created_at: string;
};

export type AssignmentMember = {
  id: string;
  assignment_id: string;
  user_id: string;
  joined_at: string;
};

export type AssignmentKelompok = {
  id: string;
  assignment_id: string;
  nama_kelompok: string;
  nomor: number;
};

export type KelompokMember = {
  id: string;
  kelompok_id: string;
  user_id: string;
  is_representative: boolean;
};

export type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  kelompok_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
};

// Baris progress untuk dashboard ketua: anggota + status submission-nya.
export type MemberProgress = {
  profile: Profile;
  submission: Submission | null;
};

// Progress per kelompok — dipakai di admin panel untuk tugas kelompok.
export type KelompokProgress = {
  kelompok: AssignmentKelompok;
  members: Profile[];
  submissions: Submission[];
};
