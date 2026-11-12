/** Sliding window throttle: at most `maxPerSecond` calls per rolling second. */
export class RequestThrottle {
  private readonly maxPerSecond: number;
  private readonly timestamps: number[] = [];
  private tail: Promise<void> = Promise.resolve();

  constructor(maxPerSecond: number) {
    this.maxPerSecond = Math.max(1, maxPerSecond);
  }

  async acquire(): Promise<void> {
    const run = async () => {
      const now = Date.now();
      const windowStart = now - 1000;
      while (this.timestamps.length > 0 && this.timestamps[0] < windowStart) {
        this.timestamps.shift();
      }
      if (this.timestamps.length >= this.maxPerSecond) {
        const waitMs = this.timestamps[0] + 1000 - now + 1;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(1, waitMs)),
        );
        return run();
      }
      this.timestamps.push(Date.now());
    };
    this.tail = this.tail.then(run, run);
    await this.tail;
  }
}
