"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gooeyToast } from "goey-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Copy,
  Check,
  ArrowRight,
  PartyPopper,
  Users,
  User,
} from "lucide-react";
import { createAssignment } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { easeMorph } from "@/components/motion";

export function NewAssignmentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; invite_code: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [tipe, setTipe] = useState<"individu" | "kelompok">("individu");
  const [jumlahKelompokStr, setJumlahKelompokStr] = useState("2");
  const jumlahKelompok = Number(jumlahKelompokStr) || 1;
  const [ketuaKelompok, setKetuaKelompok] = useState(1);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const deadlineLocal = String(form.get("deadline") ?? "");

    setLoading(true);
    const res = await createAssignment({
      nama_kelas: String(form.get("nama_kelas") ?? ""),
      nama_tugas: String(form.get("nama_tugas") ?? ""),
      deskripsi: String(form.get("deskripsi") ?? ""),
      deadline: deadlineLocal ? new Date(deadlineLocal).toISOString() : "",
      tipe,
      jumlah_kelompok: jumlahKelompok,
      ketua_kelompok: ketuaKelompok,
    });
    setLoading(false);

    if (!res.ok) {
      gooeyToast.error(res.error);
      return;
    }
    gooeyToast.success("Kelas berhasil dibuat!");
    setResult(res.data);
  }

  async function copyCode() {
    if (!result) return;
    await navigator.clipboard.writeText(result.invite_code);
    setCopied(true);
    gooeyToast.success("Kode disalin");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AnimatePresence mode="wait">
      {result ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: easeMorph }}
          className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8"
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PartyPopper className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Kelas siap dibagikan!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bagikan kode undangan ini ke teman sekelasmu untuk gabung.
          </p>

          <button
            onClick={copyCode}
            className="group mx-auto mt-5 flex items-center gap-3 rounded-xl border-2 border-dashed bg-muted/40 px-6 py-4 transition-colors hover:border-primary/50"
          >
            <span className="font-mono text-3xl font-bold tracking-[0.3em] text-primary">
              {result.invite_code}
            </span>
            {copied ? (
              <Check className="size-5 text-emerald-500" />
            ) : (
              <Copy className="size-5 text-muted-foreground group-hover:text-foreground" />
            )}
          </button>

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="outline" className="w-full" onClick={copyCode}>
              <Copy /> Salin kode
            </Button>
            <Button asChild className="w-full">
              <Link href={`/assignment/${result.id}`}>
                Buka kelas <ArrowRight />
              </Link>
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeMorph }}
          className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-2">
            <Label htmlFor="nama_kelas">Nama kelas</Label>
            <Input id="nama_kelas" name="nama_kelas" placeholder="Pemrograman Web - B" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama_tugas">Nama tugas</Label>
            <Input id="nama_tugas" name="nama_tugas" placeholder="Tugas 3 — Laporan Akhir" required />
          </div>

          {/* Tipe tugas */}
          <div className="space-y-2">
            <Label>Tipe tugas</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipe("individu")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tipe === "individu"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:border-muted-foreground/40"
                }`}
              >
                <User className="size-4" />
                Individu
              </button>
              <button
                type="button"
                onClick={() => setTipe("kelompok")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  tipe === "kelompok"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:border-muted-foreground/40"
                }`}
              >
                <Users className="size-4" />
                Kelompok
              </button>
            </div>
          </div>

          {/* Jumlah kelompok */}
          {tipe === "kelompok" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="jumlah_kelompok">Jumlah kelompok</Label>
              <Input
                id="jumlah_kelompok"
                name="jumlah_kelompok"
                type="number"
                min={1}
                max={50}
                value={jumlahKelompokStr}
                onChange={(e) => {
                  const raw = e.target.value;
                  setJumlahKelompokStr(raw);
                  const num = Number(raw);
                  if (raw === "" || isNaN(num) || num < 1) return;
                  if (ketuaKelompok > num) setKetuaKelompok(num);
                }}
              />
            </motion.div>
          )}

          {/* Pilih kelompok ketua */}
          {tipe === "kelompok" && jumlahKelompok > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label>Kamu masuk kelompok?</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: jumlahKelompok }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setKetuaKelompok(n)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        ketuaKelompok === n
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:border-muted-foreground/40"
                      }`}
                    >
                      Kelompok {n}
                    </button>
                  ),
                )}
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi (opsional)</Label>
            <Textarea id="deskripsi" name="deskripsi" placeholder="Instruksi singkat, format file, dsb." rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (opsional)</Label>
            <Input id="deadline" name="deadline" type="datetime-local" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button asChild type="button" variant="ghost">
              <Link href="/dashboard">Batal</Link>
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Membuat..." : "Buat kelas"}
            </Button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

