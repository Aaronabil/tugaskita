import Link from "next/link";
import { Plus, LogIn, Crown, Users, Inbox } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { AssignmentCard } from "@/components/assignment-card";
import { MotionList } from "@/components/motion";
import type { Assignment } from "@/lib/types";

export default async function DashboardPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  // Tugas yang aku kelola (aku ketuanya)
  const { data: managedRaw } = await supabase
    .from("assignments")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  const managed = (managedRaw ?? []) as Assignment[];

  // Keanggotaanku
  const { data: memberships } = await supabase
    .from("assignment_members")
    .select("assignment_id")
    .eq("user_id", userId);
  const memberIds = (memberships ?? []).map((m) => m.assignment_id);
  const managedIds = new Set(managed.map((a) => a.id));

  // Tugas yang aku ikuti tapi bukan aku yang buat
  const joinedIds = memberIds.filter((id) => !managedIds.has(id));
  let joined: Assignment[] = [];
  if (joinedIds.length) {
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .in("id", joinedIds)
      .order("created_at", { ascending: false });
    joined = (data ?? []) as Assignment[];
  }

  // Hitung member & submission untuk tugas yang dikelola
  const countByAssignment = (
    rows: { assignment_id: string }[] | null,
  ): Map<string, number> => {
    const map = new Map<string, number>();
    for (const r of rows ?? [])
      map.set(r.assignment_id, (map.get(r.assignment_id) ?? 0) + 1);
    return map;
  };

  let memberCounts = new Map<string, number>();
  let subCounts = new Map<string, number>();
  if (managed.length) {
    const ids = managed.map((a) => a.id);
    const [{ data: mem }, { data: subs }] = await Promise.all([
      supabase.from("assignment_members").select("assignment_id").in("assignment_id", ids),
      supabase.from("submissions").select("assignment_id").in("assignment_id", ids),
    ]);
    memberCounts = countByAssignment(mem);
    subCounts = countByAssignment(subs);
  }

  // Status upload-ku untuk tugas yang aku ikuti
  let mySubmittedSet = new Set<string>();
  if (joinedIds.length) {
    const { data: mySubs } = await supabase
      .from("submissions")
      .select("assignment_id")
      .eq("user_id", userId)
      .in("assignment_id", joinedIds);
    mySubmittedSet = new Set((mySubs ?? []).map((s) => s.assignment_id));
  }

  const isEmpty = managed.length === 0 && joined.length === 0;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar profile={profile} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Halo, {profile.nama.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola tugas kelasmu di sini.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/assignment/join">
                <LogIn /> Join Kelas
              </Link>
            </Button>
            <Button asChild>
              <Link href="/assignment/new">
                <Plus /> Buat Kelas
              </Link>
            </Button>
          </div>
        </div>

        {isEmpty && (
          <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <Inbox className="size-6 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Belum ada kelas</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Buat kelas baru sebagai ketua, atau gabung kelas teman lewat invite
              code.
            </p>
            <div className="mt-6 flex gap-2">
              <Button asChild variant="outline">
                <Link href="/assignment/join">
                  <LogIn /> Join Kelas
                </Link>
              </Button>
              <Button asChild>
                <Link href="/assignment/new">
                  <Plus /> Buat Kelas
                </Link>
              </Button>
            </div>
          </div>
        )}

        {managed.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Crown className="size-4" /> Kelas yang kamu kelola
            </h2>
            <MotionList className="grid gap-4 sm:grid-cols-2">
              {managed.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  role="ketua"
                  submitted={subCounts.get(a.id) ?? 0}
                  total={memberCounts.get(a.id) ?? 0}
                />
              ))}
            </MotionList>
          </section>
        )}

        {joined.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Users className="size-4" /> Kelas yang kamu ikuti
            </h2>
            <MotionList className="grid gap-4 sm:grid-cols-2">
              {joined.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  role="anggota"
                  mySubmitted={mySubmittedSet.has(a.id)}
                />
              ))}
            </MotionList>
          </section>
        )}
      </main>
    </div>
  );
}
