"use client";

import { GooeyToaster } from "goey-toast";

/** Notifikasi morphing (goey-toast) — dipasang sekali di root layout. */
export function Toaster() {
  return (
    <GooeyToaster
      position="top-center"
      preset="bouncy"
      richColors
      closeButton
      showProgress
    />
  );
}
