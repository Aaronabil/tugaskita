"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gooeyToast } from "goey-toast";
import { Crown, UserX } from "lucide-react";
import { kickFromKelompok } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Profile } from "@/lib/types";

type Props = {
  namaKelompok: string;
  isRepresentative: boolean;
  anggota: { profile: Profile; is_representative: boolean }[];
  kelompokId: string;
};

export function KelompokInfo({
  namaKelompok,
  isRepresentative,
  anggota,
  kelompokId,
}: Props) {
  const [kickTarget, setKickTarget] = useState<{
    userId: string;
    nama: string;
  } | null>(null);
  const [kicking, setKicking] = useState(false);

  async function handleKick() {
    if (!kickTarget) return;
    setKicking(true);
    const res = await kickFromKelompok(kelompokId, kickTarget.userId);
    if (!res.ok) {
      gooeyToast.error(res.error);
    } else {
      gooeyToast.success(
        `${kickTarget.nama} dikeluarkan dari ${namaKelompok}`,
      );
      window.location.reload();
    }
    setKicking(false);
    setKickTarget(null);
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-semibold">{namaKelompok}</h2>

      {anggota.length > 0 ? (
        <ul className="mt-3 divide-y rounded-xl border">
          {anggota.map(({ profile, is_representative: isRep }) => (
            <li
              key={profile.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {profile.nama}
                  </span>
                  {isRep && (
                    <Crown className="size-3.5 shrink-0 text-amber-500" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  NIM {profile.nim}
                </p>
              </div>
              {isRepresentative && !isRep && (
                <button
                  onClick={() =>
                    setKickTarget({
                      userId: profile.id,
                      nama: profile.nama,
                    })
                  }
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-red-500 hover:text-red-600"
                >
                  <UserX className="size-3.5" />
                  Kick
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Belum ada anggota
        </p>
      )}

      <AlertDialog
        open={!!kickTarget}
        onOpenChange={(open) => !open && setKickTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluarkan anggota?</AlertDialogTitle>
            <AlertDialogDescription>
              {kickTarget?.nama} akan dikeluarkan dari {namaKelompok} dan harus
              memilih kelompok lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={kicking}
              onClick={handleKick}
              className="bg-red-500 hover:bg-red-600"
            >
              {kicking ? "Mengeluarkan..." : "Keluarkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
