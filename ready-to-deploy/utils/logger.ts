import winston from 'winston';
import path from 'path';

/**
 * Конфигурация логгера для приложения
 * Поддерживает разные уровни логирования и транспорты
 */

// Форматирование логов для разработки (цветной вывод)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Форматирование логов для продакшена (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp({ format: 'ISO8601' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Определение уровня логирования из окружения
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Транспорт для консоли
const consoleTransport = new winston.transports.Console({
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
});

// Транспорт для файлов (только в продакшене)
const fileTransport = process.env.NODE_ENV === 'production' 
  ? new winston.transports.File({
      filename: path.join('/var/log/wb-analytics', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  : undefined;

const logger = winston.createLogger({
  level: logLevel,
  transports: [
    consoleTransport,
    ...(fileTransport ? [fileTransport] : []),
  ],
  defaultMeta: { service: 'wb-analytics' },
});

/**
 * Контекстный логгер для добавления мета-данных
 */
export function createLogger(context: Record<string, any>) {
  return {
    debug: (message: string, meta?: Record<string, any>) => 
      logger.debug(message, { ...context, ...meta }),
    info: (message: string, meta?: Record<string, any>) => 
      logger.info(message, { ...context, ...meta }),
    warn: (message: string, meta?: Record<string, any>) => 
      logger.warn(message, { ...context, ...meta }),
    error: (message: string, error?: Error, meta?: Record<string, any>) => 
      logger.error(message, { ...context, error: error?.stack || error, ...meta }),
  };
}

/**
 * Логгер для конкретных модулей
 */
export const apiLogger = createLogger({ module: 'api' });
export const dbLogger = createLogger({ module: 'database' });
export const wbApiLogger = createLogger({ module: 'wildberries-api' });
export const telegramLogger = createLogger({ module: 'telegram-bot' });
export const schedulerLogger = createLogger({ module: 'scheduler' });

/**
 * Middleware для логирования HTTP запросов
 */
export function httpLogger(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    let level: 'info' | 'warn' | 'error' = 'info';
    if (status >= 400 && status < 500) level = 'warn';
    if (status >= 500) level = 'error';
    
    logger.log(level, 'HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });
  
  next();
}

/**
 * Логирование ошибок Wildberries API
 */
export function logWbApiError(endpoint: string, error: any, context?: Record<string, any>) {
  wbApiLogger.error(`WB API Error: ${endpoint}`, error, {
    endpoint,
    statusCode: error?.statusCode || error?.status,
    ...context,
  });
}

/**
 * Логирование успешных WB API запросов
 */
export function logWbApiSuccess(endpoint: string, duration: number, count?: number) {
  wbApiLogger.info(`WB API Success: ${endpoint}`, {
    endpoint,
    duration: `${duration}ms`,
    recordsCount: count,
  });
}

/**
 * Логирование задач планировщика
 */
export function logSchedulerTask(taskName: string, status: 'started' | 'completed' | 'failed', duration?: number, error?: Error) {
  const meta: Record<string, any> = { task: taskName, status };
  if (duration) meta.duration = `${duration}ms`;
  if (error) meta.error = error.stack;
  
  if (status === 'failed') {
    schedulerLogger.error(`Task failed: ${taskName}`, error, meta);
  } else {
    schedulerLogger.info(`Task ${status}: ${taskName}`, meta);
  }
}

export default logger;
