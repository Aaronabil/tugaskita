"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { landingFadeUp } from "./fade-up";

const PROBLEMS = [
  {
    icon: "/drive.png",
    name: "Google Drive",
    desc: "Link folder berantakan, permission kacau, file teman saling timpa.",
  },
  {
    icon: "/wa.png",
    name: "Grup WhatsApp",
    desc: "File hilang di chat, ukuran kebesaran, notifikasi nggak berhenti.",
  },
  {
    icon: "/gmail.png",
    name: "Email satu-satu",
    desc: "Ketua kelas capek forward, dosen bingung mau buka attachment mana.",
  },
];

export function ProblemSection() {
  return (
    <section
      id="cara-kerja"
      className="mx-auto max-w-6xl px-8 pt-52 pb-6 text-center md:px-28 md:pt-64 md:pb-9"
    >
      <motion.h2
        {...landingFadeUp(0)}
        className="text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl"
      >
        Cara lama sudah{" "}
        <span className="font-serif font-normal italic">berubah.</span>{" "}
        Kamu?
      </motion.h2>

      <motion.p
        {...landingFadeUp(0.1)}
        className="mx-auto mt-6 max-w-2xl text-lg text-white/65"
      >
        Mahasiswa butuh cara kumpul tugas yang rapi, privat, dan bisa diandalkan,
        bukan sekadar kirim file ke grup chat.
      </motion.p>

      <div className="mb-20 mt-24 grid gap-12 md:grid-cols-3 md:gap-8">
        {PROBLEMS.map((item, i) => (
          <motion.div
            key={item.name}
            {...landingFadeUp(0.15 + i * 0.1)}
            className="flex flex-col items-center"
          >
            <div className="liquid-glass mb-6 flex size-[200px] items-center justify-center rounded-3xl">
              <img
                src={item.icon}
                alt={item.name}
                className="size-35 object-contain"
              />
            </div>
            <h3 className="text-base font-semibold">{item.name}</h3>
            <p className="mt-2 max-w-xs text-sm text-white/65">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.p
        {...landingFadeUp(0.5)}
        className="text-center text-sm text-white/65"
      >
        Kalau kelasmu belum punya sistem yang jelas, yang lain akan tetap
        ribet.
      </motion.p>
    </section>
  );
}
