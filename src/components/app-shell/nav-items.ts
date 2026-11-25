import { Inbox, Layers, Library, Star, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/" | "/library" | "/favorites" | "/collections";
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "À regarder", icon: Inbox },
  { href: "/library", label: "Bibliothèque", icon: Library },
  { href: "/favorites", label: "Favoris", icon: Star },
  { href: "/collections", label: "Collections", icon: Layers },
];

export function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
