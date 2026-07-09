"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LogoIcon } from "./logo-icon";

// const NAV_LINKS = [
//   { label: "Beranda", href: "#beranda" },
//   { label: "Cara Kerja", href: "#cara-kerja" },
//   { label: "Fitur", href: "#fitur" },
//   { label: "Kasus", href: "#kasus" },
// ];

export function LandingNavbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 px-8 py-4 md:px-28"
    >
      <div className="flex items-center justify-between gap-6">
        <Link href="#beranda" className="flex shrink-0 items-center gap-2.5">
          <LogoIcon />
          <span className="text-base font-bold tracking-tight">TugasKita</span>
        </Link>

        {/* <nav className="hidden items-center gap-3 text-sm lg:flex">
          {NAV_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center gap-3">
              {i > 0 && (
                <span className="text-white/30" aria-hidden>
                  •
                </span>
              )}
              <a
                href={link.href}
                className="text-white/65 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            </span>
          ))}
        </nav> */}

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="liquid-glass hidden rounded-full px-5 py-2 text-sm text-white/80 transition-colors hover:text-white sm:inline-flex"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Daftar
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
