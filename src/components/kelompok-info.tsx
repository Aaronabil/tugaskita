"use client";

import { gooeyToast } from "goey-toast";
import { Crown, UserX } from "lucide-react";
import { kickFromKelompok } from "@/app/actions";
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
  async function handleKick(userId: string, nama: string) {
    const res = await kickFromKelompok(kelompokId, userId);
    if (!res.ok) {
      gooeyToast.error(res.error);
    } else {
      gooeyToast.success(`${nama} dikeluarkan dari ${namaKelompok}`);
      window.location.reload();
    }
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
                  onClick={() => handleKick(profile.id, profile.nama)}
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
    </div>
  );
}
