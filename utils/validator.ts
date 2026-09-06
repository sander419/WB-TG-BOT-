import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Универсальный валидатор запросов на основе Zod
 * Автоматически генерирует ошибки и документацию
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: ValidationError[];
}

/**
 * Middleware для валидации query параметров
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response<ApiError>, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        res.status(400).json({
          error: 'Validation Error',
          message: 'Некорректные параметры запроса',
          details,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware для валидации body запроса
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response<ApiError>, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        res.status(400).json({
          error: 'Validation Error',
          message: 'Некорректные данные в теле запроса',
          details,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware для валидации URL параметров
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response<ApiError>, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        res.status(400).json({
          error: 'Validation Error',
          message: 'Некорректные параметры URL',
          details,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Комбинированный валидатор для всех частей запроса
 */
export function validateRequest<
  BodySchema extends z.ZodType,
  QuerySchema extends z.ZodType,
  ParamsSchema extends z.ZodType
>(schemas: {
  body?: BodySchema;
  query?: QuerySchema;
  params?: ParamsSchema;
}) {
  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];
  
  if (schemas.body) {
    middlewares.push(validateBody(schemas.body));
  }
  
  if (schemas.query) {
    middlewares.push(validateQuery(schemas.query));
  }
  
  if (schemas.params) {
    middlewares.push(validateParams(schemas.params));
  }
  
  return middlewares;
}

/**
 * Примеры схем для часто используемых типов
 */
export const commonSchemas = {
  // Пагинация
  pagination: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  }).refine((data) => data.page! > 0, { message: 'Page must be greater than 0' })
    .refine((data) => data.limit! > 0 && data.limit! <= 100, { message: 'Limit must be between 1 and 100' }),
  
  // ID товара
  productId: z.object({
    id: z.string().uuid('Некорректный формат ID'),
  }),
  
  // WB Article
  wbArticle: z.object({
    article: z.string().min(1, 'Article обязателен').max(50, 'Article слишком длинный'),
  }),
  
  // Даты
  dateRange: z.object({
    from: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
    to: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  }).refine((data) => {
    if (data.from && data.to) {
      return data.from <= data.to;
    }
    return true;
  }, { message: 'Дата начала должна быть раньше даты окончания' }),
  
  // Создание товара
  createProduct: z.object({
    name: z.string().min(1, 'Название обязательно').max(200, 'Название слишком длинное'),
    category: z.string().min(1, 'Категория обязательна'),
    brand: z.string().min(1, 'Бренд обязателен'),
    price: z.number().positive('Цена должна быть положительной'),
    discount: z.number().min(0, 'Скидка не может быть отрицательной').max(90, 'Скидка не может быть больше 90%'),
    barcode: z.string().optional(),
  }),
  
  // Обновление товара
  updateProduct: z.object({
    name: z.string().min(1).max(200).optional(),
    category: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    price: z.number().positive().optional(),
    discount: z.number().min(0).max(90).optional(),
  }),
};

/**
 * Обработчик ошибок валидации для глобального middleware
 */
export function handleValidationError(error: any, req: Request, res: Response<ApiError>, next: NextFunction) {
  if (error instanceof ZodError) {
    const details: ValidationError[] = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
    
    res.status(400).json({
      error: 'Validation Error',
      message: 'Ошибка валидации данных',
      details,
    });
  } else {
    next(error);
  }
}
