"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Users, CheckCircle2 } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { Badge } from "@/components/ui/badge";
import { fadeUp } from "@/components/motion";
import type { Assignment } from "@/lib/types";

type Props = {
  assignment: Assignment;
  role: "ketua" | "anggota";
  // Untuk kartu ketua: progress upload.
  submitted?: number;
  total?: number;
  // Satuan yang dihitung: "kelompok" (tugas kelompok) atau "individu".
  unit?: "kelompok" | "individu";
  // Untuk kartu anggota: apakah aku sudah upload.
  mySubmitted?: boolean;
};

export function AssignmentCard({
  assignment,
  role,
  submitted,
  total,
  unit = "individu",
  mySubmitted,
}: Props) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} className="h-full">
      <Link
        href={`/assignment/${assignment.id}`}
        className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {assignment.nama_kelas}
            </p>
            <h3 className="mt-0.5 truncate text-base font-semibold">
              {assignment.nama_tugas}
            </h3>
          </div>
          {role === "ketua" ? (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <Crown className="size-3" /> Ketua
            </Badge>
          ) : mySubmitted ? (
            <Badge className="shrink-0 gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
              <CheckCircle2 className="size-3" /> Terkumpul
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">
              Belum upload
            </Badge>
          )}
        </div>

        {assignment.deskripsi && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {assignment.deskripsi}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          <Countdown deadline={assignment.deadline} className="text-xs" />
          {role === "ketua" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground tabular-nums">
              <Users className="size-3.5" />
              {submitted ?? 0}/{total ?? 0} {unit}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
