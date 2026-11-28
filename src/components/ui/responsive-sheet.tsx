"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-media-query";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Feuille iOS (tiroir bas) sur mobile, dialogue centré sur desktop. */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ResponsiveSheetProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "gap-5 rounded-[26px] border-[var(--glass-border)] bg-popover/85 backdrop-blur-2xl sm:max-w-md",
            className,
          )}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </DialogHeader>
          {children}
          {footer ? <DialogFooter>{footer}</DialogFooter> : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          // Verre dépoli : le contenu reste deviné derrière la feuille.
          "rounded-t-[28px] border-[var(--glass-border)] bg-popover/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl data-[vaul-drawer-direction=bottom]:rounded-t-[28px]",
          className,
        )}
      >
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
          {description ? (
            <DrawerDescription>{description}</DrawerDescription>
          ) : (
            <DrawerDescription className="sr-only">{title}</DrawerDescription>
          )}
        </DrawerHeader>
        <div className="overflow-y-auto px-4">{children}</div>
        {footer ? <DrawerFooter>{footer}</DrawerFooter> : <div className="h-4" />}
      </DrawerContent>
    </Drawer>
  );
}
