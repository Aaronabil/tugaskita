"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatCountdown, getDeadlineStatus } from "@/lib/date";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  none: "text-muted-foreground",
  safe: "text-emerald-600 dark:text-emerald-400",
  soon: "text-amber-600 dark:text-amber-400",
  overdue: "text-red-600 dark:text-red-400",
};

/** Countdown hidup ke deadline; warna berubah sesuai status. */
export function Countdown({
  deadline,
  className,
}: {
  deadline: string | null;
  className?: string;
}) {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const status = getDeadlineStatus(deadline);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium tabular-nums",
        statusStyles[status],
        className,
      )}
    >
      <Clock className="size-3.5" />
      {formatCountdown(deadline)}
    </span>
  );
}
