/**
 * Helper utilities for creating domain-specific Result wrappers.
 *
 * This module provides utilities to eliminate type assertions when working
 * with custom error types in your domain.
 *
 * @module helpers
 * @since 2.2.0
 */

import { ok as baseOk, err as baseErr, type Result } from './index.js'

/**
 * Creates domain-specific `ok()` and `err()` functions bound to a custom error type.
 *
 * This eliminates the need for type assertions throughout your codebase by creating
 * wrapper functions that automatically handle the error type parameter.
 *
 * @template E - The domain error type (union of all possible errors in your domain)
 * @returns Object with `ok`, `err`, and `Result` type helper
 *
 * @example
 * ```typescript
 * // Define your domain errors
 * import { FileSystemError, ValidationError } from '@jenova-marie/ts-rust-result/errors'
 *
 * interface CustomError extends DomainError {
 *   kind: 'CustomError'
 *   customField: string
 * }
 *
 * type MyDomainError = FileSystemError | ValidationError | CustomError
 *
 * // Create domain-specific helpers
 * const { ok, err, Result } = createDomainResult<MyDomainError>()
 *
 * // Export for use throughout your module
 * export { ok, err }
 * export type MyResult<T> = ReturnType<typeof Result<T>>
 *
 * // Now use without type assertions!
 * function loadFile(path: string): MyResult<string> {
 *   if (!exists(path)) {
 *     return err(fileNotFound(path))  // ✅ No cast needed!
 *   }
 *   return ok(readFile(path))  // ✅ No cast needed!
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Recursive functions work cleanly
 * function processTree(node: Node): MyResult<ProcessedNode> {
 *   const childResults = node.children.map(processTree)
 *
 *   for (const result of childResults) {
 *     if (!result.ok) return result  // ✅ Type flows through!
 *   }
 *
 *   return ok(processedNode)  // ✅ Clean!
 * }
 * ```
 */
export function createDomainResult<E>() {
  return {
    /**
     * Creates a successful result with domain error type.
     * @template T - The success value type
     */
    ok: <T>(value: T): Result<T, E> => baseOk(value) as Result<T, E>,

    /**
     * Creates an error result with domain error type.
     */
    err: (error: E): Result<never, E> => baseErr<E>(error),

    /**
     * Type helper for creating domain Result types.
     * Use with ReturnType to create type aliases.
     * @template T - The success value type
     */
    Result: {} as <T>() => Result<T, E>
  }
}

/**
 * Type utility for extracting Result type from createDomainResult.
 *
 * @template T - The success value type
 * @template E - The domain error type
 *
 * @example
 * ```typescript
 * const { ok, err } = createDomainResult<MyDomainError>()
 *
 * // Use DomainResult as a shorthand
 * export type MyResult<T> = DomainResult<T, MyDomainError>
 *
 * function loadConfig(): MyResult<Config> {
 *   return ok(config)
 * }
 * ```
 */
export type DomainResult<T, E> = Result<T, E>
