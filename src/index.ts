/**
 * @jenova-marie/ts-rust-result v2.0.0
 *
 * Opinionated error handling with Rust's Result type.
 *
 * Main export includes core Result types (Ok, Err, Result, ok, err, etc.)
 * For error infrastructure, import from:
 * - '@jenova-marie/ts-rust-result/errors' - Error types, builder, factories
 * - '@jenova-marie/ts-rust-result/observability' - Logging, tracing, metrics
 *
 * @example
 * // Core Result usage
 * import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
 *
 * function divide(a: number, b: number): Result<number> {
 *   if (b === 0) return err(new Error('Division by zero'))
 *   return ok(a / b)
 * }
 *
 * @example
 * // With opinionated errors
 * import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
 * import { invalidFieldValue } from '@jenova-marie/ts-rust-result/errors'
 *
 * function divide(a: number, b: number): Result<number> {
 *   if (b === 0) return err(invalidFieldValue('divisor', b, 'non-zero number') as any)
 *   return ok(a / b)
 * }
 */

// Rust-style Result Toolkit for TypeScript by Pippa ✨🦀

/**
 * Represents a successful result with a value.
 * @template T - The type of the successful value
 */
export type Ok<T> = { ok: true; value: T; _isr: true }

/**
 * Represents an error result with an error object.
 */
export type Err = { ok: false; error: Error; _isr: true }

/**
 * Union type representing either a successful result (Ok) or an error result (Err).
 * @template T - The type of the successful value
 */
export type Result<T> = Ok<T> | Err

/**
 * Creates a successful result with the given value.
 *
 * @template T - The type of the value
 * @param value - The value to wrap in a successful result
 * @returns A Result object representing success with the given value
 *
 * @example
 * ```ts
 * const result = ok("hello world")
 * if (result.ok) {
 *   console.log(result.value) // "hello world"
 * }
 * ```
 */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value, _isr: true }
}

/**
 * Creates an error result with the given error.
 *
 * @param error - The error object to wrap in an error result
 * @returns A Result object representing failure with the given error
 *
 * @example
 * ```ts
 * const result = err(new Error("Something went wrong"))
 * if (!result.ok) {
 *   console.log(result.error.message) // "Something went wrong"
 * }
 * ```
 */
export function err(error: Error): Result<never> {
  return { ok: false, error, _isr: true }
}

/**
 * Type guard to check if a Result is successful.
 *
 * @template T - The type of the successful value
 * @param result - The Result to check
 * @returns True if the Result is successful (Ok), false otherwise
 *
 * @example
 * ```ts
 * const result = ok("hello world")
 * if (isOk(result)) {
 *   console.log(result.value) // TypeScript knows this is Ok<T>
 * }
 * ```
 */
export function isOk<T>(result: Result<T>): result is Ok<T> {
  return result.ok
}

/**
 * Type guard to check if a Result is an error.
 *
 * @template T - The type of the successful value
 * @param result - The Result to check
 * @returns True if the Result is an error (Err), false otherwise
 *
 * @example
 * ```ts
 * const errorResult = err(new Error("Failed"))
 * if (isErr(errorResult)) {
 *   console.error(errorResult.error) // TypeScript knows this is Err
 * }
 * ```
 */
export function isErr<T>(result: Result<T>): result is Err {
  return !result.ok
}

/**
 * Unwraps a Result, returning the value if successful or throwing the error if failed.
 *
 * @template T - The type of the successful value
 * @param result - The Result to unwrap
 * @returns The value if the Result is successful
 * @throws {Error} If the Result is an error, throws the error
 *
 * @example
 * ```ts
 * const result = ok("hello world")
 * const value = unwrap(result) // "hello world"
 *
 * const errorResult = err(new Error("Something went wrong"))
 * try {
 *   const value = unwrap(errorResult) // Throws the error
 * } catch (error) {
 *   console.error(error.message) // "Something went wrong"
 * }
 * ```
 */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw result.error
  return result.value
}

/**
 * Maps a successful Result value using the provided function.
 * If the Result is an error, returns the error unchanged.
 *
 * @template T - The type of the input value
 * @template U - The type of the output value
 * @param result - The Result to map
 * @param fn - Function to transform the successful value
 * @returns A new Result with the transformed value, or the original error
 *
 * @example
 * ```ts
 * const result = ok(5)
 * const doubled = map(result, x => x * 2) // ok(10)
 *
 * const errorResult = err(new Error("Failed"))
 * const mapped = map(errorResult, x => x * 2) // err(Error("Failed"))
 * ```
 */
export function map<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  return result.ok ? ok(fn(result.value)) : result
}

/**
 * Maps an error Result using the provided function.
 * If the Result is successful, returns the success unchanged.
 *
 * @template T - The type of the successful value
 * @param result - The Result to map the error of
 * @param fn - Function to transform the error
 * @returns A new Result with the transformed error, or the original success
 *
 * @example
 * ```ts
 * const errorResult = err(new Error("Network error"))
 * const enhancedError = mapErr(errorResult, err =>
 *   new Error(`API call failed: ${err.message}`)
 * ) // err(Error("API call failed: Network error"))
 * ```
 */
export function mapErr<T>(result: Result<T>, fn: (err: Error) => Error): Result<T> {
  return result.ok ? result : err(fn(result.error))
}

/**
 * Wraps an async function in a try-catch block and returns a Result.
 *
 * @template T - The return type of the async function
 * @param fn - The async function to execute
 * @param shouldThrow - Whether to throw the error instead of returning a Result (defaults to false)
 * @returns A Promise that resolves to a Result containing either the function's return value or an error
 * @throws {Error} If shouldThrow is true and the function throws an error
 *
 * @example
 * ```ts
 * const result = await tryResult(async () => {
 *   const response = await fetch('/api/data')
 *   return response.json()
 * })
 *
 * if (result.ok) {
 *   console.log(result.value) // The JSON data
 * } else {
 *   console.error(result.error) // Any error that occurred
 * }
 * ```
 */
export async function tryResult<T>(
  fn: () => Promise<T>,
  shouldThrow: boolean = false
): Promise<Result<T>> {
  try {
    const value: any = await fn()

    // If it's a Result, unwrap it and return the value
    if (value && value._isr) return ok(unwrap(value))

    return ok(value)
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    if (shouldThrow) {
      throw error
    }
    return err(error)
  }
}

/**
 * Rust-style assertion that returns a Result instead of throwing.
 *
 * @param condition - The condition to assert
 * @param error - The error to return if the condition is false
 * @param shouldThrow - Whether to throw the error instead of returning a Result (defaults to true)
 * @returns A Result that is ok(true) if condition is true, or err(error) if false
 * @throws {Error} If shouldThrow is true and condition is false
 *
 * @example
 * ```ts
 * const check = assert(typeof id === 'string', new Error("ID must be string"))
 * if (!check.ok) return check
 * ```
 */
export function assert(
  condition: boolean,
  error: Error = new Error('Assertion failed'),
  shouldThrow: boolean = true
): Result<true> {
  if (!condition) {
    if (shouldThrow) {
      throw error
    }
    return err(error)
  }
  return ok(true)
}

/**
 * Rust-style assertion with a typed error parameter.
 *
 * @template T - The type of the error (must extend Error)
 * @param condition - The condition to assert
 * @param error - The error object to return if the condition is false
 * @param shouldThrow - Whether to throw the error instead of returning a Result (defaults to true)
 * @returns A Result that is ok(true) if condition is true, or err(error) if false
 * @throws {T} If shouldThrow is true and condition is false
 *
 * @example
 * ```ts
 * const check = assertOr(
 *   user.isAdmin,
 *   new PermissionError("Admin access required")
 * )
 * if (!check.ok) return check
 * ```
 */
export function assertOr<T extends Error>(
  condition: boolean,
  error: T,
  shouldThrow: boolean = true
): Result<true> {
  if (!condition) {
    if (shouldThrow) {
      throw error
    }
    return err(error)
  }
  return ok(true)
}

/**
 * Asserts that a value is not null or undefined, returning the value if valid.
 *
 * @template T - The type of the value
 * @param value - The value to check for null/undefined
 * @param message - Custom error message
 * @param shouldThrow - Whether to throw the error instead of returning a Result (defaults to true)
 * @returns A Result containing the value if not null/undefined, or an error if it is
 * @throws {Error} If shouldThrow is true and value is null/undefined
 *
 * @example
 * ```ts
 * const nameCheck = assertNotNil(user.name)
 * if (!nameCheck.ok) return nameCheck
 * const name = nameCheck.value // TypeScript knows this is not null
 * ```
 */
export function assertNotNil<T>(
  value: T | null | undefined,
  message = 'Expected value to be non-null',
  shouldThrow: boolean = true
): Result<NonNullable<T>> {
  if (value === null || value === undefined) {
    const error = new Error(message)
    if (shouldThrow) {
      throw error
    }
    return err(error)
  }
  return ok(value as NonNullable<T>)
}
