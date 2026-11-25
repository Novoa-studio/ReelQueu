"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = "Rechercher",
  autoFocus,
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-xl bg-muted pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Effacer la recherche"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
