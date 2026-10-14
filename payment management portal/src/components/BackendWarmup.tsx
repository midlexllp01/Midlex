"use client";

import { useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api";

export default function BackendWarmup() {
  useEffect(() => {
    // Silently pre-warm the backend so it's awake before user performs actions
    try {
      const baseUrl = getApiBaseUrl();
      fetch(`${baseUrl}/health`, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
      }).catch(() => {
        // Suppress initial cold-start network error
      });
    } catch {
      // Ignore
    }
  }, []);

  return null;
}
