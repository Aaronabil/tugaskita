"use client";

import { motion } from "framer-motion";
import { landingFadeUp } from "./fade-up";

const SOLUTION_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_125119_8e5ae31c-0021-4396-bc08-f7aebeb877a2.mp4";

const FEATURES = [
  {
    title: "Upload Privat",
    desc: "Drag & drop tugasmu. Otomatis dinamai {NIM}_{Nama}. Teman nggak bisa intip.",
  },
  {
    title: "Zip Otomatis",
    desc: "Ketua kelas download semua submission jadi satu file .zip rapi untuk dosen.",
  },
  {
    title: "Auto Link Google Drive",
    desc: "Ketua kelas tinggal klik google drive, semua submission akan otomatis diupload ke google drive beserta linknya.",
  },
  {
    title: "Mode Kelompok",
    desc: "Tugas kelompok? Pilih kelompok, upload perwakilan, semua anggota terlacak.",
  },
];

export function SolutionSection() {
  return (
    <section
      id="fitur"
      className="border-t border-white/10 px-8 py-32 md:px-28 md:py-44"
    >
      <div className="mx-auto max-w-6xl">
        <motion.p
          {...landingFadeUp(0)}
          className="text-xs tracking-[3px] text-white/65 uppercase"
        >
          Solusi
        </motion.p>

        <motion.h2
          {...landingFadeUp(0.1)}
          className="mt-4 text-4xl font-medium tracking-[-1px] md:text-6xl"
        >
          Platform untuk{" "}
          <span className="font-serif font-normal italic">kumpul tugas</span>{" "}
          yang rapi
        </motion.h2>

        <motion.div {...landingFadeUp(0.2)} className="mt-12 overflow-hidden rounded-2xl">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="aspect-[3/1] w-full object-cover"
            src={SOLUTION_VIDEO}
          />
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div key={feature.title} {...landingFadeUp(0.25 + i * 0.08)}>
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-white/65">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
