export type StoredRecordView =
  | { readonly kind: "empty" }
  | { readonly kind: "json"; readonly text: string }
  | { readonly kind: "unreadable"; readonly raw: string };

/**
 * Prepares the raw stored record for display. Never throws: a corrupted record is shown as
 * unreadable, so the privacy center (and its "Delete everything" button) always renders.
 */
export function describeStoredRecord(raw: string | null): StoredRecordView {
  if (raw === null || raw === "") return { kind: "empty" };
  try {
    return { kind: "json", text: JSON.stringify(JSON.parse(raw), null, 2) };
  } catch {
    return { kind: "unreadable", raw };
  }
}
