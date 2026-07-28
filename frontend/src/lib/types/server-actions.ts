/**
 * Type-safe server action result patterns
 *
 * Provides Result<T, E> pattern for all server actions
 * with proper error discrimination and type narrowing
 */

/**
 * Success result
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * Failure result with structured error
 */
export interface Failure<E = Error> {
  success: false;
  error: E extends Error ? {
    message: string;
    code?: string;
    cause?: unknown;
    stack?: string;
  } : E;
}

/**
 * Result type - discriminated union for type-safe error handling
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Type guard for success results
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard for failure results
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Create success result
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Create failure result from Error
 */
export function failure(error: Error): Failure<Error>;
/**
 * Create failure result from custom error type
 */
export function failure<E>(error: E): Failure<E>;
/**
 * Create failure result from string message
 */
export function failure(message: string): Failure<Error>;

export function failure<E>(error: E | Error | string): Failure<E> {
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: (error as any).code,
        cause: error.cause,
        stack: error.stack,
      } as any,
    };
  }

  if (typeof error === 'string') {
    return {
      success: false,
      error: {
        message: error,
      } as any,
    };
  }

  return {
    success: false,
    error: error as any,
  };
}

/**
 * Unwrap result or throw
 * Useful for cases where you want to handle errors via try/catch
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isSuccess(result)) {
    return result.data;
  }
  throw new Error(
    typeof result.error === 'object' && result.error && 'message' in result.error
      ? String(result.error.message)
      : 'Unknown error'
  );
}

/**
 * Map success data to new type
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (isSuccess(result)) {
    return success(fn(result.data));
  }
  return result;
}

/**
 * Async map for result
 */
export async function mapResultAsync<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Promise<U>
): Promise<Result<U, E>> {
  if (isSuccess(result)) {
    return success(await fn(result.data));
  }
  return result;
}

/**
 * Chain results (flatMap)
 */
export function chainResult<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  if (isSuccess(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Async chain for results
 */
export async function chainResultAsync<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => AsyncResult<U, E>
): AsyncResult<U, E> {
  if (isSuccess(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Combine multiple results
 * All must succeed or returns first failure
 */
export function combineResults<T extends readonly Result<any, any>[]>(
  results: T
): Result<
  { [K in keyof T]: T[K] extends Result<infer U, any> ? U : never },
  T[number] extends Result<any, infer E> ? E : never
> {
  const data: any[] = [];

  for (const result of results) {
    if (isFailure(result)) {
      return result as any;
    }
    data.push(result.data);
  }

  return success(data as any);
}

/**
 * Try-catch wrapper that returns Result
 */
export function tryCatch<T>(fn: () => T): Result<T, Error> {
  try {
    return success(fn());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Async try-catch wrapper
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>
): AsyncResult<T, Error> {
  try {
    return success(await fn());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Convert nullable to Result
 */
export function fromNullable<T>(
  value: T | null | undefined,
  errorMessage: string = 'Value is null or undefined'
): Result<T, Error> {
  if (value === null || value === undefined) {
    return failure(new Error(errorMessage));
  }
  return success(value);
}

/**
 * Server action error types
 */
export enum ServerActionErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured server action error
 */
export interface ServerActionError {
  code: ServerActionErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Create server action error
 */
export function createServerActionError(
  code: ServerActionErrorCode,
  message: string,
  details?: Record<string, unknown>
): ServerActionError {
  return {
    code,
    message,
    details,
    timestamp: Date.now(),
  };
}

/**
 * Type-safe server action wrapper
 * Catches errors and returns consistent Result type
 */
export function serverAction<TInput, TOutput>(
  handler: (input: TInput) => Promise<TOutput>
): (input: TInput) => AsyncResult<TOutput, ServerActionError> {
  return async (input: TInput) => {
    try {
      const output = await handler(input);
      return success(output);
    } catch (error) {
      console.error('Server action error:', error);

      if (error instanceof Error) {
        // Categorize error
        let code = ServerActionErrorCode.UNKNOWN;

        if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          code = ServerActionErrorCode.UNAUTHORIZED;
        } else if (error.message.includes('forbidden')) {
          code = ServerActionErrorCode.FORBIDDEN;
        } else if (error.message.includes('not found')) {
          code = ServerActionErrorCode.NOT_FOUND;
        } else if (error.message.includes('validation')) {
          code = ServerActionErrorCode.VALIDATION_ERROR;
        } else if (error.message.includes('database') || error.message.includes('prisma')) {
          code = ServerActionErrorCode.DATABASE_ERROR;
        }

        return failure(createServerActionError(code, error.message));
      }

      return failure(
        createServerActionError(
          ServerActionErrorCode.UNKNOWN,
          'An unknown error occurred'
        )
      );
    }
  };
}
