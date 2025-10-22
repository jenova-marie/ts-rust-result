/**
 * Conversion utilities for working with errors:
 * - fromError: Convert unknown values to DomainError
 * - toSentryError: Convert DomainError to Error instance (for Sentry)
 * - tryResultSafe: Wrap async functions with automatic error conversion
 */

import type { Result } from '../index.js'
import { ok, err } from '../index.js'
import type { UnexpectedError } from './types.js'
import { error } from './builder.js'
import { captureStackFromError } from './stack.js'

/**
 * Convert an unknown error (from catch block) to UnexpectedError.
 * Preserves stack traces from Error instances, generates new stack for other values.
 *
 * @param e - The caught error (can be Error, string, object, etc.)
 * @returns UnexpectedError with original error preserved
 *
 * @example
 * try {
 *   dangerousThirdPartyFunction()
 * } catch (e) {
 *   return err(fromError(e))
 * }
 *
 * @example
 * // Preserves Error instances
 * const error = new Error('Something broke')
 * const domainError = fromError(error)
 * // domainError.stack === error.stack
 * // domainError.originalError === error
 */
export function fromError(e: unknown): UnexpectedError {
  if (e instanceof Error) {
    // Preserve original Error stack
    const builder = error('Unexpected')
      .withMessage(e.message)
      .withContext({ originalError: e })

    // Manually set stack from Error instance
    const stack = captureStackFromError(e)
    if (stack) {
      return {
        ...builder.captureStack().build(),
        stack, // Override with original stack
      } as UnexpectedError
    }

    return builder.build() as UnexpectedError
  }

  // Non-Error values: stringify and capture new stack
  return error('Unexpected')
    .withMessage(String(e))
    .withContext({ originalError: e })
    .captureStack() // Generate new stack
    .build() as UnexpectedError
}

/**
 * Convert a DomainError to an Error instance (for Sentry, error monitors, etc.).
 * Creates an Error with:
 * - name = error.kind
 * - message = error.message
 * - stack = error.stack (or generates new if missing)
 * - context fields assigned as error properties
 *
 * @param domainError - The DomainError to convert
 * @returns Error instance suitable for Sentry.captureException()
 *
 * @example
 * import * as Sentry from '@sentry/node'
 *
 * const result = loadConfig()
 * if (!result.ok) {
 *   Sentry.captureException(toSentryError(result.error))
 * }
 *
 * @example
 * // Error properties include context
 * const fileError = fileNotFound('/missing.txt')
 * const sentryError = toSentryError(fileError)
 * // sentryError.name === 'FileNotFound'
 * // sentryError.message === 'File not found: /missing.txt'
 * // sentryError.path === '/missing.txt' (from context)
 */
export function toSentryError(domainError: { kind: string; message: string; stack?: string; context?: Record<string, unknown> }): Error {
  const err = new Error(domainError.message)
  err.name = domainError.kind

  // Use captured stack if available, otherwise keep generated stack
  if (domainError.stack) {
    err.stack = `${err.name}: ${err.message}\n${domainError.stack}`
  }

  // Add context fields as error properties for Sentry breadcrumbs
  if (domainError.context) {
    Object.assign(err, domainError.context)
  }

  return err
}

/**
 * Wrap an async function to automatically convert throws to UnexpectedError.
 * Similar to tryResult(), but converts errors using fromError().
 * Preserves existing Result returns (no double wrapping).
 *
 * @param fn - Async function to wrap
 * @returns Promise<Result<T, UnexpectedError>>
 *
 * @example
 * // Wrap third-party async function
 * const result = await tryResultSafe(async () => {
 *   return await fetch('https://api.example.com/data')
 * })
 *
 * if (!result.ok) {
 *   // result.error is UnexpectedError with stack trace
 *   logger.error(toLogContext(result.error))
 * }
 *
 * @example
 * // Doesn't double-wrap Result-returning functions
 * function loadConfig(): Result<Config, ConfigError> {
 *   // ...
 * }
 *
 * const result = await tryResultSafe(async () => loadConfig())
 * // result is Result<Config, ConfigError>, not Result<Result<Config, ConfigError>, UnexpectedError>
 */
export async function tryResultSafe<T>(
  fn: () => Promise<T>
): Promise<Result<T, UnexpectedError>> {
  try {
    const value = await fn()

    // Detect existing Result and unwrap (prevents Result<Result<T>>)
    if (value && typeof value === 'object' && '_isr' in value && (value as any)._isr === true) {
      return value as unknown as Result<T, UnexpectedError>
    }

    return ok(value) as Result<T, UnexpectedError>
  } catch (e) {
    return err(fromError(e)) as Result<T, UnexpectedError>
  }
}

/**
 * Synchronous version of tryResultSafe for non-async functions.
 * Wraps function execution and converts throws to UnexpectedError.
 *
 * @param fn - Function to wrap
 * @returns Result<T, UnexpectedError>
 *
 * @example
 * const result = tryResultSafeSync(() => {
 *   return JSON.parse(dangerousInput)
 * })
 *
 * if (!result.ok) {
 *   // result.error.kind === 'Unexpected'
 *   // result.error.originalError is the JSON parse error
 * }
 */
export function tryResultSafeSync<T>(fn: () => T): Result<T, UnexpectedError> {
  try {
    const value = fn()

    // Detect existing Result and unwrap
    if (value && typeof value === 'object' && '_isr' in value && (value as any)._isr === true) {
      return value as unknown as Result<T, UnexpectedError>
    }

    return ok(value) as Result<T, UnexpectedError>
  } catch (e) {
    return err(fromError(e)) as Result<T, UnexpectedError>
  }
}
