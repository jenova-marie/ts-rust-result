/**
 * Zod integration helpers for converting Zod validation results to Result types.
 *
 * Note: This module has type-only imports to avoid requiring zod as a dependency.
 * Zod is an optional peer dependency - users who want Zod integration must install it separately.
 */

import type { Result } from '../TsRustResult'
import { ok, err } from '../TsRustResult'
import type { ValidationError } from './types'
import { error } from './builder'

/**
 * Type definitions for Zod (to avoid requiring zod as dependency).
 * These match Zod's public API types.
 */

/** Zod validation issue from ZodError.errors */
export interface ZodIssue {
  path: (string | number)[]
  message: string
  code: string
}

/** Zod error object */
export interface ZodError {
  errors: ZodIssue[]
}

/** Zod successful parse result */
export interface ZodSuccessResult<T> {
  success: true
  data: T
}

/** Zod failed parse result */
export interface ZodFailureResult {
  success: false
  error: ZodError
}

/** Zod safeParse return type */
export type ZodSafeParseResult<T> = ZodSuccessResult<T> | ZodFailureResult

/** Zod schema interface (minimal) */
export interface ZodSchema<T> {
  safeParse(data: unknown): ZodSafeParseResult<T>
}

/**
 * Convert Zod safeParse result to Result<T, ValidationError>.
 * Transforms Zod validation errors into standard ValidationError format.
 *
 * @param result - Result from schema.safeParse(data)
 * @returns Result<T, ValidationError>
 *
 * @example
 * import { z } from 'zod'
 * import { fromZodSafeParse } from '@jenova-marie/ts-rust-result/errors'
 *
 * const UserSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 *   age: z.number().min(18)
 * })
 *
 * const result = fromZodSafeParse(UserSchema.safeParse(data))
 *
 * if (!result.ok) {
 *   // result.error.kind === 'SchemaValidation'
 *   // result.error.issues contains detailed validation errors
 *   logger.error(toLogContext(result.error))
 * }
 */
export function fromZodSafeParse<T>(
  result: ZodSafeParseResult<T>
): Result<T> {
  if (result.success) {
    return ok(result.data)
  }

  // Transform Zod issues to our ValidationIssue format
  const issues = result.error.errors.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
  }))

  return err(
    error('SchemaValidation')
      .withMessage(`Validation failed: ${issues.length} issue(s)`)
      .withContext({ issues })
      .skipStack() // Validation errors don't need stack traces
      .build() as any // TODO: Fix typing - err expects Error
  ) as Result<T>
}

/**
 * Convenience wrapper that calls schema.safeParse() and converts to Result.
 * Combines safeParse + fromZodSafeParse in one call.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result<T, ValidationError>
 *
 * @example
 * import { z } from 'zod'
 * import { fromZodSchema } from '@jenova-marie/ts-rust-result/errors'
 *
 * const ConfigSchema = z.object({
 *   port: z.number().min(1).max(65535),
 *   host: z.string(),
 *   debug: z.boolean()
 * })
 *
 * function loadConfig(data: unknown): Result<Config, ValidationError> {
 *   return fromZodSchema(ConfigSchema, data)
 * }
 *
 * const result = loadConfig(rawConfig)
 * if (result.ok) {
 *   // result.value is strongly typed as Config
 *   startServer(result.value)
 * }
 */
export function fromZodSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
): Result<T> {
  return fromZodSafeParse(schema.safeParse(data))
}

/**
 * Type guard to check if a value is a Zod schema.
 * Useful for conditional Zod integration.
 *
 * @param value - Value to check
 * @returns true if value has safeParse method
 *
 * @example
 * function validate(schema: unknown, data: unknown): Result<unknown, ValidationError> {
 *   if (isZodSchema(schema)) {
 *     return fromZodSchema(schema, data)
 *   }
 *   throw new Error('Not a Zod schema')
 * }
 */
export function isZodSchema(value: unknown): value is ZodSchema<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'safeParse' in value &&
    typeof (value as any).safeParse === 'function'
  )
}
