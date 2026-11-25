import type { Platform } from "@/types";
import { getPlatform } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export function PlatformDot({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: getPlatform(platform).color }}
    />
  );
}

export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", className)}>
      <PlatformDot platform={platform} />
      {getPlatform(platform).label}
    </span>
  );
}
