import { useCallback } from "react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

export function useOnboardingTracking() {
  const track = useCallback(async (step: string, metadata?: Record<string, any>) => {
    try {
      await fetch(`${API}/analytics/onboarding/track`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, metadata }),
      });
    } catch {}
  }, []);

  return { trackStep: track };
}
