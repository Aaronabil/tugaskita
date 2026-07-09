"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { landingFadeUp } from "./fade-up";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_120549_0cd82c36-56b3-4dd9-b190-069cfc3a623f.mp4";

export function HeroSection() {
  return (
    <section
      id="beranda"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 size-full object-cover"
        src={HERO_VIDEO}
      />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-28 text-center md:pt-32">
        <motion.div
          {...landingFadeUp(0.1)}
          className="mb-8 flex items-center gap-3"
        >
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-sm">
            2TI01
          </span>
          <span className="text-sm text-white/65">
            Dibuat untuk teman sekelas kelas 2TI01
          </span>
        </motion.div>

        <motion.h1
          {...landingFadeUp(0.2)}
          className="text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl"
        >
          Kumpulin tugas{" "}
          <span className="font-serif text-[1.05em] font-normal italic">
            tanpa ribet
          </span>
        </motion.h1>

        <motion.p
          {...landingFadeUp(0.3)}
          className="text-hero-subtitle mt-6 max-w-2xl text-lg"
        >
          Upload tugasmu secara privat, ketua kelas kumpulkan semua jadi satu link google drive atau
          file .zip rapi, perjalanan bersama menuju deadline tanpa takut
          dicomot.
        </motion.p>

        <motion.div
          {...landingFadeUp(0.4)}
          className="liquid-glass mt-10 flex w-34 max-w-lg flex-col gap-2 rounded-full p-2 sm:flex-row"
        >
          {/* <input
            type="email"
            placeholder="Email kampus kamu"
            className="min-w-0 flex-1 bg-transparent px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none"
            readOnly
            onFocus={(e) => e.target.removeAttribute("readonly")}
          /> */}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/register"
              className="inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold tracking-wide text-black"
            >
              DAFTAR
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
