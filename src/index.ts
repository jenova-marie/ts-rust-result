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

// Export all functions and types from TsRustResult
export * from './TsRustResult';
