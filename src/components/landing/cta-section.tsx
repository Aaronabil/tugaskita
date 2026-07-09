"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HlsVideo } from "./hls-video";
import { LogoIcon } from "./logo-icon";
import { landingFadeUp } from "./fade-up";

const CTA_HLS =
  "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-white/10 py-32 md:py-44">
      <HlsVideo
        src={CTA_HLS}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-8 text-center">
        <motion.div {...landingFadeUp(0)}>
          <LogoIcon size="lg" />
        </motion.div>

        <motion.h2
          {...landingFadeUp(0.1)}
          className="mt-6 text-4xl font-medium tracking-[-1px] md:text-5xl"
        >
          Mulai{" "}
          <span className="font-serif font-normal italic">Perjalananmu</span>
        </motion.h2>

        <motion.p
          {...landingFadeUp(0.2)}
          className="mt-4 text-lg text-white/65"
        >
          Daftar gratis, buat atau gabung kelas, dan kumpulkan tugas tanpa
          drama mulai hari ini.
        </motion.p>

        <motion.div
          {...landingFadeUp(0.3)}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/register"
              className="inline-flex rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-black"
            >
              Daftar Sekarang
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/register"
              className="liquid-glass inline-flex rounded-lg px-8 py-3.5 text-sm font-medium text-white"
            >
              Buat Kelas
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
