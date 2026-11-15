export interface TtlCacheOptions {
  hitTtlMs: number;
  missTtlMs: number;
  maxEntries?: number;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<V> {
  private readonly hitTtlMs: number;
  private readonly missTtlMs: number;
  private readonly maxEntries: number;
  private readonly map = new Map<string, Entry<V>>();

  constructor(options: TtlCacheOptions) {
    this.hitTtlMs = Math.max(1, options.hitTtlMs);
    this.missTtlMs = Math.max(1, options.missTtlMs);
    this.maxEntries = Math.max(1, options.maxEntries ?? 2048);
  }

  get(key: string): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, hit: boolean): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, {
      value,
      expiresAt: Date.now() + (hit ? this.hitTtlMs : this.missTtlMs),
    });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  size(): number {
    return this.map.size;
  }
}