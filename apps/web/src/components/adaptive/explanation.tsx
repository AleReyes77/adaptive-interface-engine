"use client";

import { useDimension, useTrack } from "@aie/react";
import { useId, useState } from "react";
import { TOPIC_TITLES, TOPICS, type TopicId } from "@/content/topics";
import { useExplanation } from "@/lib/explanations";
import { Adapted } from "./adapted";

interface ExplanationProps {
  readonly topicId: TopicId;
  /** Heading level for the title, to fit the surrounding document outline. */
  readonly as?: "h2" | "h3";
}

/** An explanation whose depth follows the `explanationLevel` dimension. */
export function Explanation({ topicId, as: Heading = "h3" }: ExplanationProps) {
  const level = useDimension("explanationLevel");
  const track = useTrack();
  const explanation = useExplanation(topicId, level);
  const [expanded, setExpanded] = useState(false);
  const longerId = useId();
  const showLonger = expanded && level !== "simplified";

  return (
    <section aria-labelledby={`${longerId}-title`}>
      <Heading id={`${longerId}-title`} className="text-lg font-bold leading-snug">
        {TOPIC_TITLES[topicId]}
      </Heading>
      <Adapted dimension="explanationLevel" className="mt-2">
        <p className="max-w-prose" aria-live="polite">
          {explanation.text}
        </p>
        {explanation.source === "ai" && (
          <p className="mt-1 text-sm text-ink-muted">Reworded by the optional AI service.</p>
        )}
      </Adapted>

      {showLonger && (
        <p
          id={longerId}
          className="mt-3 max-w-prose border-s-2 border-line-strong ps-3 text-ink-muted"
        >
          {TOPICS[topicId].simplified}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <button
          type="button"
          className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          onClick={() => track({ type: "help.opened", topicId })}
        >
          This isn't clear
        </button>
        {level !== "simplified" && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={longerId}
            className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
            onClick={() => {
              if (!expanded) track({ type: "explanation.expanded", topicId });
              setExpanded(!expanded);
            }}
          >
            {expanded ? "Hide the longer version" : "Read the longer version"}
          </button>
        )}
        {explanation.canRewrite && (
          <button
            type="button"
            disabled={explanation.rewriting}
            className="font-semibold text-engine underline decoration-engine/40 underline-offset-4 disabled:opacity-60"
            onClick={explanation.rewrite}
          >
            {explanation.rewriting ? "Rewording…" : "Word it differently"}
          </button>
        )}
      </div>
      {explanation.rewriteError && (
        <p role="status" className="mt-2 text-sm text-caution">
          {explanation.rewriteError}
        </p>
      )}
    </section>
  );
}
