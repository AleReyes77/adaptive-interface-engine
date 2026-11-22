import type { DimensionValue } from "../profile/dimensions";

export type ExplanationLevel = DimensionValue<"explanationLevel">;

export interface ExplanationRequest {
  readonly topicId: string;
  readonly level: ExplanationLevel;
}

export interface Explanation {
  readonly text: string;
  readonly source: "static" | "ai";
}

/**
 * Produces an explanation of a topic at a given level of detail.
 * A request carries only a topic id and a level: never anything about the person.
 */
export interface ExplanationProvider {
  explain(request: ExplanationRequest): Promise<Explanation>;
}

export type ExplanationContent = Readonly<
  Record<string, Readonly<Record<ExplanationLevel, string>>>
>;

/** Serves explanations written by people, one per level. Deterministic and offline. */
export function createStaticProvider(content: ExplanationContent): ExplanationProvider {
  return {
    async explain({ topicId, level }) {
      const topic = content[topicId];
      if (!topic) throw new Error(`No explanation for topic "${topicId}"`);
      return { text: topic[level], source: "static" };
    },
  };
}

/** Uses `primary` (for example an AI provider) and falls back when it fails or is unavailable. */
export function withFallback(
  primary: ExplanationProvider,
  fallback: ExplanationProvider,
): ExplanationProvider {
  return {
    async explain(request) {
      try {
        return await primary.explain(request);
      } catch {
        return fallback.explain(request);
      }
    },
  };
}
