import type { TrackedEvent } from "./taxonomy";

export interface EventStoreOptions {
  /** Maximum number of events kept in memory. The oldest are evicted first. */
  readonly capacity?: number;
  /** Events older than this are forgotten. */
  readonly retentionMs?: number;
}

export interface EventStore {
  add(event: TrackedEvent): void;
  /** Events still inside the retention window at `now`, oldest first. Expired events are dropped. */
  list(now: number): readonly TrackedEvent[];
  /** Removes every event the predicate matches (used when consent is revoked). */
  purge(predicate: (event: TrackedEvent) => boolean): void;
  clear(): void;
}

export const DEFAULT_STORE_CAPACITY = 500;
export const DEFAULT_RETENTION_MS = 20 * 60 * 1000;

/**
 * A bounded, in-memory event log with a retention window.
 * Memory use is capped by `capacity` and data age is capped by `retentionMs`,
 * so the engine can never accumulate an interaction history.
 */
export function createEventStore(options: EventStoreOptions = {}): EventStore {
  const capacity = options.capacity ?? DEFAULT_STORE_CAPACITY;
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  let events: TrackedEvent[] = [];

  return {
    add(event) {
      events.push(event);
      if (events.length > capacity) events = events.slice(events.length - capacity);
    },
    list(now) {
      const cutoff = now - retentionMs;
      if (events.length > 0 && (events[0]?.at ?? now) < cutoff) {
        events = events.filter((event) => event.at >= cutoff);
      }
      return events.slice();
    },
    purge(predicate) {
      events = events.filter((event) => !predicate(event));
    },
    clear() {
      events = [];
    },
  };
}
