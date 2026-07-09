"use client";

import { motion } from "framer-motion";
import { ScrollRevealText } from "./scroll-reveal-text";
import { landingFadeUp } from "./fade-up";

const MISSION_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_132944_a0d124bb-eaa1-4082-aa30-2310efb42b4b.mp4";

export function MissionSection() {
  return (
    <section id="kasus" className="mx-auto max-w-5xl px-8 pb-32 md:px-28 md:pb-44">
      <motion.div {...landingFadeUp(0)} className="mx-auto mb-16 max-w-[800px]">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="aspect-square w-full rounded-3xl object-cover"
          src={MISSION_VIDEO}
        />
      </motion.div>

      <ScrollRevealText
        text="Kami membangun ruang di mana privasi bertemu kemudahan, di mana mahasiswa upload dengan tenang, ketua kelas kumpulkan tanpa ribet, dan setiap tugas jadi pengalaman yang layak."
        highlights={["privasi", "bertemu", "kemudahan"]}
        className="text-2xl font-medium tracking-[-1px] md:text-4xl lg:text-5xl"
      />

      <ScrollRevealText
        text="Platform di mana upload, komunitas kelas, dan pengumpulan tugas mengalir bersama, dengan lebih sedikit drama, lebih sedikit comot, dan lebih banyak waktu buat fokus belajar."
        className="mt-10 text-xl font-medium tracking-[-1px] md:text-2xl lg:text-3xl"
      />
    </section>
  );
}
