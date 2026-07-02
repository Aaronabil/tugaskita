"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gooeyToast } from "goey-toast";
import { Loader2, LogIn, Users } from "lucide-react";
import { joinAssignment, getKelompokList, joinKelompok } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinAssignmentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  // Step 2 — kelompok picker
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [kelompokList, setKelompokList] = useState<
    { id: string; nama_kelompok: string; nomor: number; anggota_count: number }[]
  >([]);
  const [selectedKelompok, setSelectedKelompok] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.trim().length !== 8) {
      gooeyToast.error("Kode undangan harus 8 karakter");
      return;
    }

    setLoading(true);
    const res = await joinAssignment(code);
    setLoading(false);

    if (!res.ok) {
      gooeyToast.error(res.error);
      return;
    }

    if (res.data.tipe === "individu" || res.data.telah_memilih_kelompok) {
      gooeyToast.success("Berhasil gabung kelas!");
      router.push(`/assignment/${res.data.id}`);
      router.refresh();
      return;
    }

    // Kelompok — tampilkan pilihan kelompok.
    setAssignmentId(res.data.id);
    const kelompokRes = await getKelompokList(res.data.id);
    if (kelompokRes.ok) {
      setKelompokList(kelompokRes.data);
    }
  }

  async function handlePilihKelompok() {
    if (!assignmentId || !selectedKelompok) return;

    setJoining(true);
    const res = await joinKelompok(assignmentId, selectedKelompok);
    setJoining(false);

    if (!res.ok) {
      gooeyToast.error(res.error);
      return;
    }

    gooeyToast.success("Berhasil gabung kelas!");
    router.push(`/assignment/${assignmentId}`);
    router.refresh();
  }

  // Step 2: pilih kelompok
  if (assignmentId) {
    return (
      <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
          <h2 className="mt-3 text-lg font-semibold">Pilih kelompok</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tugas ini bertipe kelompok. Pilih kelompok yang ingin kamu ikuti.
          </p>
        </div>

        <div className="space-y-2">
          {kelompokList.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setSelectedKelompok(k.id)}
              className={`w-full rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                selectedKelompok === k.id
                  ? "border-primary bg-primary/10"
                  : "border-input hover:border-muted-foreground/40"
              }`}
            >
              <span className="font-medium">{k.nama_kelompok}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                ({k.anggota_count} anggota)
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setAssignmentId(null);
              setSelectedKelompok(null);
            }}
          >
            Kembali
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!selectedKelompok || joining}
            onClick={handlePilihKelompok}
          >
            {joining ? <Loader2 className="animate-spin" /> : <LogIn />}
            {joining ? "Menggabungkan..." : "Gabung kelas"}
          </Button>
        </div>
      </div>
    );
  }

  // Step 1: input invite code
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="space-y-2">
        <Label htmlFor="code">Invite code</Label>
        <Input
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
          placeholder="ABCD1234"
          autoComplete="off"
          autoCapitalize="characters"
          className="text-center font-mono text-2xl font-bold tracking-[0.4em]"
          maxLength={8}
        />
        <p className="text-xs text-muted-foreground">
          Minta kode 8 karakter ini ke ketua kelasmu.
        </p>
      </div>

      <div className="flex gap-2">
        <Button asChild type="button" variant="ghost">
          <Link href="/dashboard">Batal</Link>
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          {loading ? "Menggabungkan..." : "Gabung kelas"}
        </Button>
      </div>
    </form>
  );
}
