export interface LruCacheOptions {
  maxEntries: number;
}

export class LruCache<V> {
  private readonly maxEntries: number;
  private readonly map = new Map<string, V>();

  constructor(options: LruCacheOptions) {
    this.maxEntries = Math.max(1, options.maxEntries);
  }

  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  size(): number {
    return this.map.size;
  }
}
