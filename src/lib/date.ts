// Util tanggal, deadline, dan countdown (semua Bahasa Indonesia).

export type DeadlineStatus = "none" | "safe" | "soon" | "overdue";

/** < 24 jam = "soon" (kuning), lewat = "overdue" (merah). */
export function getDeadlineStatus(deadline: string | null): DeadlineStatus {
  if (!deadline) return "none";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "overdue";
  if (diff <= 24 * 60 * 60 * 1000) return "soon";
  return "safe";
}

/** Format tanggal panjang, mis. "Sen, 12 Jan 2026 pukul 23.59". */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "Tanpa deadline";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(deadline));
}

/**
 * Sisa waktu ke deadline dalam format ringkas: "2h 4j 12m",
 * atau "Lewat deadline" bila sudah terlewat.
 */
export function formatCountdown(deadline: string | null): string {
  if (!deadline) return "Tanpa deadline";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Lewat deadline";

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) return `${days}h ${hours}j ${minutes}m`;
  if (hours > 0) return `${hours}j ${minutes}m ${seconds}d`;
  return `${minutes}m ${seconds}d`;
}
