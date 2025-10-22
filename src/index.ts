/**
 * @jenova-marie/ts-rust-result v2.1.0
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
 * // With opinionated errors (2.1.0+)
 * import { ok, err, type Result } from '@jenova-marie/ts-rust-result'
 * import { invalidFieldValue, type InvalidFieldValueError } from '@jenova-marie/ts-rust-result/errors'
 *
 * function divide(a: number, b: number): Result<number, InvalidFieldValueError> {
 *   if (b === 0) return err(invalidFieldValue('divisor', b, 'non-zero number'))
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
 * @template E - The type of the error (defaults to Error)
 */
export type Err<E = Error> = { ok: false; error: E; _isr: true }

/**
 * Union type representing either a successful result (Ok) or an error result (Err).
 * @template T - The type of the successful value
 * @template E - The type of the error (defaults to Error)
 */
export type Result<T, E = Error> = Ok<T> | Err<E>

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
 * @template E - The type of the error
 * @param error - The error object to wrap in an error result
 * @returns A Result object representing failure with the given error
 *
 * @example
 * ```ts
 * const result = err(new Error("Something went wrong"))
 * if (!result.ok) {
 *   console.log(result.error.message) // "Something went wrong"
 * }
 *
 * // With DomainError (2.1.0+)
 * import { fileNotFound } from '@jenova-marie/ts-rust-result/errors'
 * const result = err(fileNotFound('/missing.txt'))
 * // result.error is typed as FileNotFoundError
 * ```
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error, _isr: true }
}

/**
 * Type guard to check if a Result is successful.
 *
 * @template T - The type of the successful value
 * @template E - The type of the error
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
export function isOk<T, E = Error>(result: Result<T, E>): result is Ok<T> {
  return result.ok
}

/**
 * Type guard to check if a Result is an error.
 *
 * @template T - The type of the successful value
 * @template E - The type of the error
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
export function isErr<T, E = Error>(result: Result<T, E>): result is Err<E> {
  return !result.ok
}

/**
 * Unwraps a Result, returning the value if successful or throwing the error if failed.
 *
 * @template T - The type of the successful value
 * @template E - The type of the error
 * @param result - The Result to unwrap
 * @returns The value if the Result is successful
 * @throws {E} If the Result is an error, throws the error
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
export function unwrap<T, E = Error>(result: Result<T, E>): T {
  if (!result.ok) throw result.error
  return result.value
}

/**
 * Maps a successful Result value using the provided function.
 * If the Result is an error, returns the error unchanged.
 *
 * @template T - The type of the input value
 * @template U - The type of the output value
 * @template E - The type of the error
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
export function map<T, U, E = Error>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value)) as Result<U, E>
  }
  return result as Err<E>
}

/**
 * Maps an error Result using the provided function.
 * If the Result is successful, returns the success unchanged.
 *
 * @template T - The type of the successful value
 * @template E - The type of the input error
 * @template F - The type of the output error
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
export function mapErr<T, E = Error, F = Error>(
  result: Result<T, E>,
  fn: (err: E) => F
): Result<T, F> {
  return result.ok ? result : err(fn(result.error))
}

/**
 * Wraps an async function in a try-catch block and returns a Result.
 *
 * @template T - The return type of the async function
 * @template E - The type of the error (defaults to Error)
 * @param fn - The async function to execute
 * @param shouldThrow - Whether to throw the error instead of returning a Result (defaults to false)
 * @returns A Promise that resolves to a Result containing either the function's return value or an error
 * @throws {E} If shouldThrow is true and the function throws an error
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
export async function tryResult<T, E = Error>(
  fn: () => Promise<T>,
  shouldThrow: boolean = false
): Promise<Result<T, E>> {
  try {
    const value: any = await fn()

    // If it's a Result, unwrap it and return the value
    if (value && value._isr) return ok(unwrap(value)) as Result<T, E>

    return ok(value) as Result<T, E>
  } catch (e) {
    const error = (e instanceof Error ? e : new Error(String(e))) as E
    if (shouldThrow) {
      throw error
    }
    return err(error) as Result<T, E>
  }
}

/**
 * Rust-style assertion that returns a Result instead of throwing.
 *
 * @template E - The type of the error (defaults to Error)
 * @param condition - The condition to assert
 * @param error - The error to return if the condition is false
 * @param shouldThrow - Whether to throw the error instead of returning a Result (defaults to true)
 * @returns A Result that is ok(true) if condition is true, or err(error) if false
 * @throws {E} If shouldThrow is true and condition is false
 *
 * @example
 * ```ts
 * const check = assert(typeof id === 'string', new Error("ID must be string"))
 * if (!check.ok) return check
 * ```
 */
export function assert<E = Error>(
  condition: boolean,
  error: E = new Error('Assertion failed') as E,
  shouldThrow: boolean = true
): Result<true, E> {
  if (!condition) {
    if (shouldThrow) {
      throw error
    }
    return err(error) as Result<true, E>
  }
  return ok(true) as Result<true, E>
}

/**
 * Rust-style assertion with a typed error parameter.
 *
 * @template E - The type of the error
 * @param condition - The condition to assert
 * @param error - The error object to return if the condition is false
 * @param shouldThrow - Whether to throw the error instead of returning a Result (defaults to true)
 * @returns A Result that is ok(true) if condition is true, or err(error) if false
 * @throws {E} If shouldThrow is true and condition is false
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
export function assertOr<E>(
  condition: boolean,
  error: E,
  shouldThrow: boolean = true
): Result<true, E> {
  if (!condition) {
    if (shouldThrow) {
      throw error
    }
    return err(error) as Result<true, E>
  }
  return ok(true) as Result<true, E>
}

/**
 * Asserts that a value is not null or undefined, returning the value if valid.
 *
 * @template T - The type of the value
 * @template E - The type of the error (defaults to Error)
 * @param value - The value to check for null/undefined
 * @param message - Custom error message
 * @param shouldThrow - Whether to throw the error instead of returning a Result (defaults to true)
 * @returns A Result containing the value if not null/undefined, or an error if it is
 * @throws {E} If shouldThrow is true and value is null/undefined
 *
 * @example
 * ```ts
 * const nameCheck = assertNotNil(user.name)
 * if (!nameCheck.ok) return nameCheck
 * const name = nameCheck.value // TypeScript knows this is not null
 * ```
 */
export function assertNotNil<T, E = Error>(
  value: T | null | undefined,
  message = 'Expected value to be non-null',
  shouldThrow: boolean = true
): Result<NonNullable<T>, E> {
  if (value === null || value === undefined) {
    const error = new Error(message) as E
    if (shouldThrow) {
      throw error
    }
    return err(error) as Result<NonNullable<T>, E>
  }
  return ok(value as NonNullable<T>) as Result<NonNullable<T>, E>
}
