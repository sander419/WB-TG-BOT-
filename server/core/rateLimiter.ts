/**
 * Token bucket для соблюдения лимитов маркетплейсов.
 *
 * У WB лимиты объявлены отдельно на каждую группу API (контент, цены, статистика,
 * отзывы), причём считаются на токен продавца. Поэтому лимитер создаётся
 * на пару (магазин, группа API), а не один на процесс.
 *
 * Ограничение реализации: состояние в памяти процесса. При нескольких инстансах
 * лимит будет умножен на их число — тогда переносить в Redis (см. docs/ARCHITECTURE.md,
 * раздел «Очереди и воркеры»).
 */

export interface RateLimitConfig {
  /** Сколько запросов разрешено за интервал. */
  capacity: number;
  /** Длина интервала в миллисекундах. */
  intervalMs: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly refillPerMs: number;
  private queue: Array<() => void> = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly config: RateLimitConfig) {
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
    this.refillPerMs = config.capacity / config.intervalMs;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.config.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastRefill = now;
  }

  /** Ждёт, пока освободится слот. Порядок вызовов сохраняется (FIFO). */
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1 && this.queue.length === 0) {
      this.tokens -= 1;
      return;
    }
    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.scheduleDrain();
    });
  }

  private scheduleDrain(): void {
    if (this.timer) return;
    const waitMs = Math.max(10, Math.ceil((1 - this.tokens) / this.refillPerMs));
    this.timer = setTimeout(() => {
      this.timer = null;
      this.drain();
    }, waitMs);
  }

  private drain(): void {
    this.refill();
    while (this.tokens >= 1 && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) break;
      this.tokens -= 1;
      next();
    }
    if (this.queue.length > 0) this.scheduleDrain();
  }

  /** Текущее состояние — для диагностики и метрик. */
  snapshot(): { availableTokens: number; queued: number; capacity: number; intervalMs: number } {
    this.refill();
    return {
      availableTokens: Math.floor(this.tokens),
      queued: this.queue.length,
      capacity: this.config.capacity,
      intervalMs: this.config.intervalMs,
    };
  }
}

/** Реестр лимитеров по ключу «магазин:группа API». */
export class RateLimiterRegistry {
  private readonly limiters = new Map<string, RateLimiter>();

  get(key: string, config: RateLimitConfig): RateLimiter {
    const existing = this.limiters.get(key);
    if (existing) return existing;
    const created = new RateLimiter(config);
    this.limiters.set(key, created);
    return created;
  }

  snapshot(): Record<string, ReturnType<RateLimiter['snapshot']>> {
    const result: Record<string, ReturnType<RateLimiter['snapshot']>> = {};
    for (const [key, limiter] of this.limiters) result[key] = limiter.snapshot();
    return result;
  }
}

export const rateLimiters = new RateLimiterRegistry();
