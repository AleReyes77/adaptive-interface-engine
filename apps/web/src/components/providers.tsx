"use client";

import { AdaptiveProvider, useDimension } from "@aie/react";
import { type ReactNode, useEffect } from "react";
import { ExplanationsProvider } from "@/lib/explanations";

/** Mirrors the navigation dimension onto <html>, so global focus styles can adapt. */
function NavigationMode() {
  const navigation = useDimension("navigation");
  useEffect(() => {
    document.documentElement.dataset.nav = navigation;
  }, [navigation]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AdaptiveProvider>
      <NavigationMode />
      <ExplanationsProvider>{children}</ExplanationsProvider>
    </AdaptiveProvider>
  );
}
