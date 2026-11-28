import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Pictogramme ReelQueue : des Reels en éventail avec un bouton lecture.
 * Même dessin que l'icône de l'application (scripts/generate-icons.mjs).
 */
export function LogoMark({ className }: { className?: string }) {
  // Identifiants uniques : le logo peut apparaître plusieurs fois, parfois
  // dans un bloc masqué (un dégradé masqué ne s'affiche plus ailleurs).
  const id = useId().replace(/:/g, "");
  const ref = (name: string) => `${id}-${name}`;
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden className={cn("size-7", className)}>
      <defs>
        <linearGradient id={ref("bg")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7686ff" />
          <stop offset="0.5" stopColor="#4f5de4" />
          <stop offset="1" stopColor="#3424ad" />
        </linearGradient>
        <radialGradient id={ref("cyan")} cx="0" cy="0" r="0.55">
          <stop offset="0" stopColor="#7ae8ff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#7ae8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ref("pink")} cx="1" cy="1" r="0.75">
          <stop offset="0" stopColor="#ff6fb1" stopOpacity="0.65" />
          <stop offset="1" stopColor="#ff6fb1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ref("glass")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.65" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={ref("card")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e8ff" />
        </linearGradient>
        <linearGradient id={ref("play")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a68ff" />
          <stop offset="1" stopColor="#8139ee" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="232" fill={`url(#${ref("bg")})`} />
      <rect width="1024" height="1024" rx="232" fill={`url(#${ref("cyan")})`} />
      <rect width="1024" height="1024" rx="232" fill={`url(#${ref("pink")})`} />
      {/* Pictogramme un peu plus grand que sur l'icône : lisible à 28 px. */}
      <g transform="translate(0 -8)">
        <rect x="316" y="196" width="392" height="572" rx="106" fill="#fff" fillOpacity="0.22" transform="rotate(-13 512 900)" />
        <rect x="316" y="196" width="392" height="572" rx="106" fill={`url(#${ref("glass")})`} transform="rotate(10 512 900)" />
        <rect x="296" y="226" width="432" height="612" rx="114" fill={`url(#${ref("card")})`} />
        <path
          d="M468 452 L468 612 L607 532 Z"
          fill={`url(#${ref("play")})`}
          stroke={`url(#${ref("play")})`}
          strokeWidth="48"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight", className)}>
      <LogoMark />
      ReelQueue
    </span>
  );
}
