import { cn } from "@/lib/utils";

/** Pictogramme ReelQueue : une file de cartes avec un bouton lecture. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <rect x="9" y="6.5" width="14" height="3" rx="1.5" className="fill-brand-foreground" opacity="0.45" />
      <rect x="7" y="11" width="18" height="15" rx="4" className="fill-brand-foreground" />
      <path d="M14 15.2v6.6c0 .5.5.8 1 .5l5.2-3.3c.4-.3.4-.8 0-1.1L15 14.7c-.5-.3-1 0-1 .5Z" className="fill-brand" />
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
