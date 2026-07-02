import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { JoinAssignmentForm } from "@/components/join-assignment-form";

export default async function JoinAssignmentPage() {
  const { profile } = await requireProfile();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar profile={profile} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali
        </Link>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Gabung kelas</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Masukkan invite code dari ketua kelasmu untuk mulai mengumpulkan tugas.
        </p>
        <JoinAssignmentForm />
      </main>
    </div>
  );
}
