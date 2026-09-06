import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

/**
 * Универсальный лимитер запросов для защиты API
 * Используется для защиты от DDoS и злоупотреблений
 */

// Лимитер для обычных пользователей: 100 запросов в минуту
const apiLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

// Лимитер для чувствительных операций (логин, смена пароля): 5 попыток в минуту
const authLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Лимитер для WB API запросов: 30 запросов в секунду (ограничение WB)
const wbApiLimiter = new RateLimiterMemory({
  points: 30,
  duration: 1,
});

export interface RateLimitError {
  msBeforeNext: number;
  remainingPoints: number;
}

/**
 * Middleware для ограничения скорости API запросов
 */
export function rateLimitMiddleware(
  limiter: RateLimiterMemory = apiLimiter,
  keyGenerator?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || req.socket.remoteAddress || 'unknown';
    
    try {
      const rlResponse = await limiter.consume(key);
      
      // Добавляем заголовки с информацией о лимитах
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', rlResponse.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rlResponse.msBeforeNext).toISOString());
      
      next();
    } catch (rejRes: any) {
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
      res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Превышен лимит запросов. Пожалуйста, попробуйте позже.',
        retryAfter: Math.ceil(rejRes.msBeforeNext / 1000),
      });
    }
  };
}

/**
 * Лимитер для публичного API
 */
export const publicApiRateLimit = rateLimitMiddleware(apiLimiter);

/**
 * Лимитер для аутентификации
 */
export const authRateLimit = rateLimitMiddleware(authLimiter, (req) => {
  // Лимит по IP + User-Agent для лучшей защиты
  return `${req.ip}:${req.get('User-Agent') || 'unknown'}`;
});

/**
 * Лимитер для WB API запросов
 */
export const wbApiRateLimit = rateLimitMiddleware(wbApiLimiter);

/**
 * Утилита для проверки лимита без блокировки (для мониторинга)
 */
export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<RateLimitError> {
  try {
    const rlResponse = await limiter.consume(key, 0); // 0 points - только проверка
    return {
      msBeforeNext: 0,
      remainingPoints: rlResponse.remainingPoints,
    };
  } catch (rejRes: any) {
    return {
      msBeforeNext: rejRes.msBeforeNext,
      remainingPoints: rejRes.remainingPoints,
    };
  }
}

/**
 * Сброс лимита для конкретного ключа (например, после успешной верификации)
 */
export async function resetRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<void> {
  await limiter.delete(key);
}
