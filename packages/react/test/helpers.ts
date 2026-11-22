/** A minimal in-memory implementation of the Web Storage API for tests. */
export class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

/** A storage that throws on every access, like Safari private mode or blocked cookies. */
export class ThrowingStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new DOMException("denied", "SecurityError");
  }
  override setItem(): void {
    throw new DOMException("quota", "QuotaExceededError");
  }
}

export const ALL_CONSENT = {
  interaction: true,
  forms: true,
  timing: true,
  modality: true,
  remember: false,
};
