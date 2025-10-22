/**
 * Opinionated error handling infrastructure for ts-rust-result 2.0.
 *
 * This module provides:
 * - Standard error types (FileSystem, Parse, Validation, Network, Database, Auth, Config)
 * - Builder pattern for error construction
 * - Factory shortcuts for common errors
 * - Error conversion utilities (fromError, toSentryError, tryResultSafe)
 * - Zod integration helpers
 * - NODE_ENV-aware stack trace capture
 *
 * @example
 * import { error, fileNotFound, fromError } from '@jenova-marie/ts-rust-result/errors'
 *
 * // Builder pattern
 * const e1 = error('FileNotFound')
 *   .withMessage('File not found: /missing.txt')
 *   .withContext({ path: '/missing.txt' })
 *   .build()
 *
 * // Factory shortcut
 * const e2 = fileNotFound('/missing.txt')
 *
 * // Convert third-party errors
 * try {
 *   dangerousOperation()
 * } catch (e) {
 *   return err(fromError(e))
 * }
 */

// Re-export all types
export * from './types.js'

// Re-export builder
export * from './builder.js'

// Re-export factories
export * from './factories.js'

// Re-export conversion utilities
export * from './conversion.js'

// Re-export stack utilities
export * from './stack.js'

// Re-export Zod integration
export * from './zod.js'
