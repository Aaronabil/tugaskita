"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

function ScrollWord({
  word,
  index,
  total,
  progress,
  highlight,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  highlight: boolean;
}) {
  const start = Math.max(0, index / total - 0.05);
  const end = Math.min(1, (index + 1) / total + 0.05);
  const opacity = useTransform(progress, [start, end], [0.15, 1]);

  return (
    <motion.span
      style={{ opacity }}
      className={highlight ? "text-white" : "text-hero-subtitle"}
    >
      {word}{" "}
    </motion.span>
  );
}

export function ScrollRevealText({
  text,
  highlights = [],
  className,
}: {
  text: string;
  highlights?: string[];
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.35"],
  });

  const words = text.split(" ");
  const normalizedHighlights = new Set(
    highlights.map((w) => w.toLowerCase().replace(/[.,—]/g, "")),
  );

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <ScrollWord
          key={`${word}-${i}`}
          word={word}
          index={i}
          total={words.length}
          progress={scrollYProgress}
          highlight={normalizedHighlights.has(
            word.toLowerCase().replace(/[.,—]/g, ""),
          )}
        />
      ))}
    </p>
  );
}
