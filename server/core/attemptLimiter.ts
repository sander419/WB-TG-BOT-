/**
 * Счётчик попыток с окном и отказом.
 *
 * Отличается от token bucket в rateLimiter.ts тем, что не ставит в очередь,
 * а отвечает «нет». Для лимитов площадки нужна очередь: запрос всё равно надо
 * выполнить, просто позже. Для входа очередь противопоказана — она превращает
 * перебор в медленный, но рабочий.
 *
 * Отдельно решена проблема роста: ключом служит почта или адрес, то есть
 * значение из запроса. Словарь без уборки — это способ съесть память чужими
 * данными, а не защита.
 */

export interface AttemptLimiterOptions {
  /** Сколько попыток разрешено за окно. */
  limit: number;
  windowMs: number;
  /**
   * Потолок числа ключей. При превышении вычищаются истёкшие, а если и это
   * не помогло — самые старые. Ограничение памяти важнее точности лимита
   * для редких ключей.
   */
  maxKeys?: number;
}

export interface AttemptResult {
  allowed: boolean;
  /** Сколько попыток осталось в текущем окне. */
  remaining: number;
  /** Через сколько миллисекунд окно сбросится. */
  retryAfterMs: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

const DEFAULT_MAX_KEYS = 10_000;

export class AttemptLimiter {
  private readonly entries = new Map<string, Entry>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;

  constructor(options: AttemptLimiterOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  }

  /** Считает попытку и говорит, разрешена ли она. Атомарно в пределах цикла событий. */
  consume(key: string, now = Date.now()): AttemptResult {
    const entry = this.entries.get(key);

    if (!entry || entry.resetAt <= now) {
      this.evictIfNeeded(now);
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1, retryAfterMs: this.windowMs };
    }

    if (entry.count >= this.limit) {
      return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
    }

    entry.count += 1;
    return { allowed: true, remaining: this.limit - entry.count, retryAfterMs: entry.resetAt - now };
  }

  /** Сбросить счётчик — например, после успешного входа. */
  reset(key: string): void {
    this.entries.delete(key);
  }

  size(): number {
    return this.entries.size;
  }

  private evictIfNeeded(now: number): void {
    if (this.entries.size < this.maxKeys) return;

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }

    // Истёкших не хватило: словарь заполняют быстрее, чем он протухает.
    // Выбрасываем самые ранние — Map сохраняет порядок вставки.
    if (this.entries.size >= this.maxKeys) {
      const excess = this.entries.size - this.maxKeys + 1;
      let removed = 0;
      for (const key of this.entries.keys()) {
        this.entries.delete(key);
        removed += 1;
        if (removed >= excess) break;
      }
    }
  }
}
