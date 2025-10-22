/**
 * Builder pattern for creating domain errors with a fluent API.
 *
 * @example
 * const error = error('FileNotFound')
 *   .withMessage('File not found: /missing.txt')
 *   .withContext({ path: '/missing.txt' })
 *   .build()
 */

import type { DomainError } from './types.js'
import { captureStack, getCaptureStacks } from './stack.js'

/**
 * Fluent builder interface for constructing domain errors.
 *
 * @typeParam K - The error kind (literal type for discriminated unions)
 */
export interface ErrorBuilder<K extends string = string> {
  /**
   * Set the human-readable error message.
   * Required before calling build().
   */
  withMessage(message: string): ErrorBuilder<K>

  /**
   * Add structured context for logging/observability.
   * Can be called multiple times - contexts are merged.
   */
  withContext(context: Record<string, unknown>): ErrorBuilder<K>

  /**
   * Set the error that caused this error (error chaining).
   * Supports both DomainError and third-party errors.
   */
  withCause(cause: DomainError | unknown): ErrorBuilder<K>

  /**
   * Force stack trace capture (even in production).
   * Overrides NODE_ENV-based behavior for this error only.
   */
  captureStack(): ErrorBuilder<K>

  /**
   * Skip stack trace capture (even in dev/test).
   * Useful for expected validation errors that don't need stacks.
   */
  skipStack(): ErrorBuilder<K>

  /**
   * Build the final error object.
   * Validates message is set, auto-generates timestamp, captures stack if enabled.
   *
   * @returns Immutable frozen error object
   * @throws {Error} If message was not set
   */
  build(): DomainError & { kind: K }
}

/**
 * Internal builder implementation.
 */
class ErrorBuilderImpl<K extends string> implements ErrorBuilder<K> {
  private kind: K
  private message?: string
  private context: Record<string, unknown> = {}
  private cause?: DomainError | unknown
  private stackOverride?: 'capture' | 'skip'

  constructor(kind: K) {
    this.kind = kind
  }

  withMessage(message: string): ErrorBuilder<K> {
    this.message = message
    return this
  }

  withContext(context: Record<string, unknown>): ErrorBuilder<K> {
    // Merge contexts (later calls override earlier keys)
    this.context = { ...this.context, ...context }
    return this
  }

  withCause(cause: DomainError | unknown): ErrorBuilder<K> {
    this.cause = cause
    return this
  }

  captureStack(): ErrorBuilder<K> {
    this.stackOverride = 'capture'
    return this
  }

  skipStack(): ErrorBuilder<K> {
    this.stackOverride = 'skip'
    return this
  }

  build(): DomainError & { kind: K } {
    // Validate message is set
    if (!this.message) {
      throw new Error(
        `Error builder for kind '${this.kind}' requires a message. Call withMessage() before build().`
      )
    }

    // Determine if we should capture stack
    const shouldCapture =
      this.stackOverride === 'capture'
        ? true
        : this.stackOverride === 'skip'
          ? false
          : getCaptureStacks()

    // Build error object
    const error: DomainError & { kind: K } = {
      kind: this.kind,
      message: this.message,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      cause: this.cause,
      stack: shouldCapture ? captureStack() : undefined,
      timestamp: Date.now(),
    }

    // Remove undefined fields for cleaner serialization
    const cleanError = Object.fromEntries(
      Object.entries(error).filter(([, value]) => value !== undefined)
    ) as DomainError & { kind: K }

    // Freeze to ensure immutability
    return Object.freeze(cleanError)
  }
}

/**
 * Create a new error builder for the specified kind.
 *
 * @typeParam K - The error kind (literal type)
 * @param kind - Discriminator for the error (e.g., 'FileNotFound', 'InvalidJSON')
 * @returns Fluent builder interface
 *
 * @example
 * // Build a file not found error
 * const error = error('FileNotFound')
 *   .withMessage('File not found: /missing.txt')
 *   .withContext({ path: '/missing.txt' })
 *   .build()
 *
 * @example
 * // Build with error chaining
 * const outerError = error('ConfigParseError')
 *   .withMessage('Failed to parse config file')
 *   .withContext({ configFile: 'app.json' })
 *   .withCause(innerError)
 *   .build()
 *
 * @example
 * // Force stack capture in production
 * const criticalError = error('DatabaseConnectionFailed')
 *   .withMessage('Cannot connect to database')
 *   .captureStack() // Override NODE_ENV
 *   .build()
 *
 * @example
 * // Skip stack for validation errors
 * const validationError = error('RequiredFieldMissing')
 *   .withMessage('Required field missing: email')
 *   .skipStack() // No stack needed for expected validation
 *   .build()
 */
export function error<K extends string>(kind: K): ErrorBuilder<K> {
  return new ErrorBuilderImpl(kind)
}
