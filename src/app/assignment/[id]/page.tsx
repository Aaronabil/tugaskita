import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Crown, CalendarClock, Users } from "lucide-react";

export const dynamic = "force-dynamic";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { UploadZone } from "@/components/upload-zone";
import { AdminPanel } from "@/components/admin-panel";
import { Countdown } from "@/components/countdown";
import { Badge } from "@/components/ui/badge";
import { formatDeadline, getDeadlineStatus } from "@/lib/date";
import type {
  Assignment,
  KelompokProgress,
  KelompokProgressMember,
  MemberProgress,
  Profile,
  Submission,
  AssignmentKelompok,
} from "@/lib/types";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: assignmentRaw } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!assignmentRaw) notFound();
  const assignment = assignmentRaw as Assignment;
  const isKetua = assignment.created_by === userId;
  const isKelompok = assignment.tipe === "kelompok";

  // Pastikan user adalah anggota (atau ketua) tugas ini.
  const { data: membership } = await supabase
    .from("assignment_members")
    .select("id")
    .eq("assignment_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership && !isKetua) redirect("/dashboard");

  // Submission milikku (individu) atau kelompokku
  const { data: mySub } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const mySubmission = (mySub ?? null) as Submission | null;

  // Kelompok: cari kelompok user, cek apakah perwakilan
  let userKelompok: { id: string; nama_kelompok: string } | null = null;
  let isRepresentative = false;
  let kelompokSubmissions: Submission[] = [];

  if (isKelompok) {
    const { data: semuaKelompok } = await supabase
      .from("assignment_kelompok")
      .select("id")
      .eq("assignment_id", id);
    const kelompokIds = (semuaKelompok ?? []).map((k) => k.id);

    const { data: km } = kelompokIds.length > 0
      ? await supabase
          .from("kelompok_members")
          .select("kelompok_id, is_representative")
          .in("kelompok_id", kelompokIds)
          .eq("user_id", userId)
          .maybeSingle()
      : { data: null };

    if (km) {
      isRepresentative = km.is_representative;
      const { data: k } = await supabase
        .from("assignment_kelompok")
        .select("id, nama_kelompok")
        .eq("id", km.kelompok_id)
        .single();
      if (k) {
        userKelompok = k;
        // Ambil semua submission kelompok ini.
        const { data: subs } = await supabase
          .from("submissions")
          .select("*")
          .eq("kelompok_id", k.id)
          .order("uploaded_at", { ascending: true });
        kelompokSubmissions = (subs ?? []) as Submission[];
      }
    }
  }

  // Data progress untuk ketua
  let memberProgress: MemberProgress[] = [];
  let kelompokProgress: KelompokProgress[] = [];

  if (isKetua) {
    if (isKelompok) {
      // Kelompok: progress per kelompok
      const { data: kelompoks } = await supabase
        .from("assignment_kelompok")
        .select("*")
        .eq("assignment_id", id)
        .order("nomor", { ascending: true });

      const allKelompoks = (kelompoks ?? []) as AssignmentKelompok[];

      for (const k of allKelompoks) {
        const { data: kms } = await supabase
          .from("kelompok_members")
          .select("user_id, is_representative")
          .eq("kelompok_id", k.id);

        const memberIds = (kms ?? []).map((km) => km.user_id);
        const isRepByUser = new Map<string, boolean>();
        (kms ?? []).forEach((km) => isRepByUser.set(km.user_id, km.is_representative));

        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", memberIds);

        const { data: subs } = await supabase
          .from("submissions")
          .select("*")
          .eq("kelompok_id", k.id)
          .order("uploaded_at", { ascending: true });

        const members: KelompokProgressMember[] = ((profiles ?? []) as Profile[]).map((p) => ({
          profile: p,
          is_representative: isRepByUser.get(p.id) ?? false,
        }));

        kelompokProgress.push({
          kelompok: k,
          members,
          submissions: (subs ?? []) as Submission[],
        });
      }
    } else {
      // Individu: progress per user (existing logic)
      const { data: members } = await supabase
        .from("assignment_members")
        .select("user_id")
        .eq("assignment_id", id);
      const memberIds = (members ?? []).map((m) => m.user_id);

      if (memberIds.length) {
        const [{ data: profiles }, { data: subs }] = await Promise.all([
          supabase.from("profiles").select("*").in("id", memberIds),
          supabase.from("submissions").select("*").eq("assignment_id", id),
        ]);

        const subByUser = new Map<string, Submission>();
        for (const s of (subs ?? []) as Submission[]) subByUser.set(s.user_id, s);

        memberProgress = ((profiles ?? []) as Profile[])
          .map((p) => ({ profile: p, submission: subByUser.get(p.id) ?? null }))
          .sort((a, b) => {
            // Yang belum upload di atas, lalu urut nama.
            const av = a.submission ? 1 : 0;
            const bv = b.submission ? 1 : 0;
            if (av !== bv) return av - bv;
            return a.profile.nama.localeCompare(b.profile.nama);
          });
      }
    }
  }

  const deadlineStatus = getDeadlineStatus(assignment.deadline);
  const isOverdue = deadlineStatus === "overdue";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar profile={profile} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali
        </Link>

        {/* Header tugas */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {assignment.nama_kelas}
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight">
                {assignment.nama_tugas}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                variant="secondary"
                className="gap-1"
              >
                {isKelompok ? (
                  <><Users className="size-3" /> Kelompok</>
                ) : (
                  <><Users className="size-3" /> Individu</>
                )}
              </Badge>
              {isKetua && (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="size-3" /> Ketua
                </Badge>
              )}
            </div>
          </div>

          {assignment.deskripsi && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {assignment.deskripsi}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="size-4" />
              {formatDeadline(assignment.deadline)}
            </span>
            <Countdown deadline={assignment.deadline} className="text-sm" />
          </div>

          {/* Info kelompok user */}
          {isKelompok && userKelompok && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <Users className="size-4 text-muted-foreground" />
              <span className="font-medium">{userKelompok.nama_kelompok}</span>
              {isRepresentative && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Perwakilan
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Upload */}
        <div className="mt-5">
          <UploadZone
            assignmentId={id}
            profile={profile}
            initialSubmission={mySubmission}
            isOverdue={isOverdue}
            uploadedAtLabel={
              mySubmission ? formatDeadline(mySubmission.uploaded_at) : null
            }
            kelompokId={userKelompok?.id}
            isRepresentative={isRepresentative}
            kelompokSubmissions={kelompokSubmissions}
          />
        </div>

        {/* Panel ketua */}
        {isKetua && (
          <div className="mt-5">
            <AdminPanel
              assignmentId={id}
              inviteCode={assignment.invite_code}
              progress={memberProgress}
              gdriveLink={assignment.gdrive_link}
              assignment={assignment}
              kelompokProgress={kelompokProgress}
            />
          </div>
        )}
      </main>
    </div>
  );
}
