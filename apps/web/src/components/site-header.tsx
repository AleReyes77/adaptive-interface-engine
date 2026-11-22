"use client";

import { hasAnyConsent } from "@aie/engine";
import { useEngineSnapshot } from "@aie/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/console", label: "Console" },
  { href: "/privacy", label: "Privacy" },
] as const;

function EngineStatus() {
  const { consent, paused, matchedRuleIds } = useEngineSnapshot();
  const on = hasAnyConsent(consent) && !paused;
  const label = paused ? "Adaptation paused" : on ? "Adapting" : "Adaptation off";
  return (
    <Link
      href="/privacy"
      className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm text-ink-muted hover:border-line-strong hover:text-ink"
    >
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", on ? "bg-engine" : "bg-line-strong")}
      />
      {label}
      {on && matchedRuleIds.length > 0 && (
        <span className="text-ink">
          {matchedRuleIds.length} {matchedRuleIds.length === 1 ? "rule" : "rules"}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:gap-x-8 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M8 8v8" stroke="var(--engine)" strokeWidth="3" strokeLinecap="round" />
            <path
              d="M12 11h5M12 15h3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Adaptive Interface Engine
        </Link>
        <nav aria-label="Main" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
          {LINKS.map((link) => {
            const current = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 font-semibold",
                  current ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto">
          <EngineStatus />
        </div>
      </div>
    </header>
  );
}
