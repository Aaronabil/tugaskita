import Link from "next/link";
import { ArrowRight, ShieldCheck, UploadCloud, FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionList, MotionItem } from "@/components/motion";

export default function LandingPage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Latar gradient lembut */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]"
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-heading text-lg font-extrabold tracking-tight">
          Tugas<span className="text-primary">Kita</span>
        </span>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Daftar</Link>
          </Button>
        </div>
      </header>

      <MotionList className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <MotionItem>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Privat — tugasmu tidak bisa dilihat teman
          </span>
        </MotionItem>

        <MotionItem>
          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Kumpulin tugas tanpa ribet,{" "}
            <span className="text-primary">tanpa takut dicomot</span>
          </h1>
        </MotionItem>

        <MotionItem>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            Tiap mahasiswa upload tugasnya sendiri secara privat. Ketua kelas
            mengumpulkan semua dan generate satu file <b>.zip</b> rapi untuk
            diserahkan ke dosen.
          </p>
        </MotionItem>

        <MotionItem>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group w-full sm:w-auto">
              <Link href="/register">
                Mulai sekarang
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">Sudah punya akun</Link>
            </Button>
          </div>
        </MotionItem>

        <MotionItem className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {[
            {
              icon: UploadCloud,
              title: "Upload privat",
              desc: "Drag & drop tugasmu. Otomatis dinamai {NIM}_{Nama}.",
            },
            {
              icon: ShieldCheck,
              title: "Anti-comot",
              desc: "Hanya kamu yang bisa lihat file-mu. Teman tak bisa intip.",
            },
            {
              icon: FolderArchive,
              title: "1 klik untuk dosen",
              desc: "Ketua download semua submission jadi satu .zip.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border bg-card/60 p-5 text-left backdrop-blur transition-colors hover:border-primary/40"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </MotionItem>
      </MotionList>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-center text-xs text-muted-foreground">
        TugasKita — dibuat untuk mahasiswa yang capek tugasnya dicomot.
      </footer>
    </main>
  );
}
