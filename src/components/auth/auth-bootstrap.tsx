"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/store/auth";

/** Initialise la session une seule fois, pour toutes les routes. */
export function AuthBootstrap() {
  useEffect(() => {
    useAuth.getState().init();
  }, []);
  return null;
}
