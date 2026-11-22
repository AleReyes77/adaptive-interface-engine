import type { Modality } from "@aie/engine";

/** Keys that indicate keyboard *navigation*, as opposed to typing text. */
const NAVIGATION_KEYS = new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
  "Escape",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/** Inside a text field only these keys count as navigation; the rest is typing. */
const FIELD_NAVIGATION_KEYS = new Set(["Tab", "Escape"]);

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !["checkbox", "radio", "button", "submit", "reset", "range"].includes(target.type);
  }
  return false;
}

export interface ModalityTrackingOptions {
  /** Repeated reports of the same modality are throttled to one per interval. */
  readonly throttleMs?: number;
  readonly now?: () => number;
}

/**
 * Reports which input modality is in use. Only the *kind* of input is reported:
 * no key values, no coordinates, no text.
 */
export function installModalityTracking(
  target: Window,
  report: (modality: Modality) => void,
  { throttleMs = 1_000, now = Date.now }: ModalityTrackingOptions = {},
): () => void {
  let last: { modality: Modality; at: number } | null = null;

  const emit = (modality: Modality) => {
    const at = now();
    if (last && last.modality === modality && at - last.at < throttleMs) return;
    last = { modality, at };
    report(modality);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const shortcut = event.ctrlKey || event.metaKey || event.altKey;
    const keys = isTextEntry(event.target) ? FIELD_NAVIGATION_KEYS : NAVIGATION_KEYS;
    if (shortcut || keys.has(event.key)) emit("keyboard");
  };

  const onPointerDown = (event: PointerEvent) => {
    emit(event.pointerType === "touch" ? "touch" : "pointer");
  };

  target.addEventListener("keydown", onKeyDown, { capture: true, passive: true });
  target.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  return () => {
    target.removeEventListener("keydown", onKeyDown, { capture: true });
    target.removeEventListener("pointerdown", onPointerDown, { capture: true });
  };
}
