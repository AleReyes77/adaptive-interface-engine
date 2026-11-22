"use client";

import {
  createStaticProvider,
  type Explanation,
  type ExplanationLevel,
  type ExplanationProvider,
} from "@aie/engine";
import { createContext, type ReactNode, use, useCallback, useEffect, useState } from "react";
import { TOPICS, type TopicId } from "@/content/topics";

interface ExplanationContextValue {
  readonly staticProvider: ExplanationProvider;
  readonly ai: ExplanationProvider | null;
}

const staticProvider = createStaticProvider(TOPICS);

const ExplanationContext = createContext<ExplanationContextValue>({ staticProvider, ai: null });

/** Calls the optional server route. It only ever sends a topic id and a level. */
const aiProvider: ExplanationProvider = {
  async explain({ topicId, level }) {
    const response = await fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topicId, level }),
    });
    if (!response.ok) throw new Error(`Explanation service answered ${response.status}`);
    const data = (await response.json()) as { text?: unknown };
    if (typeof data.text !== "string") throw new Error("Malformed explanation");
    return { text: data.text, source: "ai" };
  },
};

export function ExplanationsProvider({ children }: { children: ReactNode }) {
  const [ai, setAi] = useState<ExplanationProvider | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/explain")
      .then((r) => (r.ok ? (r.json() as Promise<{ available?: boolean }>) : { available: false }))
      .then((data) => {
        if (!cancelled && data.available === true) setAi(aiProvider);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <ExplanationContext value={{ staticProvider, ai }}>{children}</ExplanationContext>;
}

export interface UseExplanation {
  readonly text: string;
  readonly source: Explanation["source"];
  readonly canRewrite: boolean;
  readonly rewriting: boolean;
  readonly rewriteError: string | null;
  rewrite(): void;
}

/** Authored text for the level, with an optional AI rewrite that falls back silently. */
export function useExplanation(topicId: TopicId, level: ExplanationLevel): UseExplanation {
  const { ai } = use(ExplanationContext);
  const [rewritten, setRewritten] = useState<{ key: string; text: string } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const key = `${topicId}:${level}`;

  const rewrite = useCallback(() => {
    if (!ai) return;
    setRewriting(true);
    setRewriteError(null);
    ai.explain({ topicId, level })
      .then((result) => setRewritten({ key, text: result.text }))
      .catch(() =>
        setRewriteError("The rewrite service is unavailable. The original text is shown."),
      )
      .finally(() => setRewriting(false));
  }, [ai, topicId, level, key]);

  const useRewritten = rewritten?.key === key;
  return {
    text: useRewritten ? rewritten.text : TOPICS[topicId][level],
    source: useRewritten ? "ai" : "static",
    canRewrite: ai !== null,
    rewriting,
    rewriteError,
    rewrite,
  };
}
