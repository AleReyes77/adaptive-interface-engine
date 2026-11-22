"use client";

import { useCallback, useRef } from "react";
import { useTrack } from "../hooks";

export interface TaskTimer {
  start(): void;
  complete(): void;
}

/** Reports when a task starts and how long it took to complete. */
export function useTaskTimer(taskId: string): TaskTimer {
  const track = useTrack();
  const startedAt = useRef<number | null>(null);

  const start = useCallback(() => {
    startedAt.current = Date.now();
    track({ type: "task.started", taskId });
  }, [track, taskId]);

  const complete = useCallback(() => {
    const durationMs = startedAt.current === null ? 0 : Date.now() - startedAt.current;
    startedAt.current = null;
    track({ type: "task.completed", taskId, durationMs });
  }, [track, taskId]);

  return { start, complete };
}
