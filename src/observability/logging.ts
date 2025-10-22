/**
 * Logging helpers for converting errors to structured log contexts.
 * Integrates with Pino, Winston, Grafana Loki, and other structured loggers.
 */

import type { DomainError } from '../errors/types.js'

/**
 * Maximum depth for error cause chain traversal.
 * Prevents infinite loops in circular error references.
 */
const MAX_CAUSE_DEPTH = 10

/**
 * Convert a DomainError to structured log context.
 * Suitable for Pino, Winston, or any structured logger.
 *
 * @param error - The DomainError to convert
 * @param depth - Current recursion depth (internal use)
 * @returns Structured log context object
 *
 * @example
 * import pino from 'pino'
 * import { toLogContext } from '@jenova-marie/ts-rust-result/observability'
 *
 * const logger = pino()
 *
 * const result = loadConfig()
 * if (!result.ok) {
 *   logger.error(toLogContext(result.error), 'Failed to load config')
 * }
 *
 * // Logs:
 * // {
 * //   "error_kind": "FileNotFound",
 * //   "error_message": "File not found: /app/config.json",
 * //   "error_context": { "path": "/app/config.json" },
 * //   "error_timestamp": 1234567890,
 * //   "msg": "Failed to load config"
 * // }
 */
export function toLogContext(error: DomainError, depth = 0): Record<string, unknown> {
  // Prevent infinite recursion
  if (depth > MAX_CAUSE_DEPTH) {
    return {
      error_kind: 'MaxCauseDepthExceeded',
      error_message: `Max cause chain depth (${MAX_CAUSE_DEPTH}) exceeded`,
    }
  }

  const context: Record<string, unknown> = {
    error_kind: error.kind,
    error_message: error.message,
  }

  // Add optional fields if present
  if (error.context) {
    context.error_context = error.context
  }

  if (error.timestamp) {
    context.error_timestamp = error.timestamp
  }

  if (error.stack) {
    context.error_stack = error.stack
  }

  // Recursively add cause chain
  if (error.cause) {
    // Check if cause is a DomainError
    if (
      typeof error.cause === 'object' &&
      error.cause !== null &&
      'kind' in error.cause &&
      'message' in error.cause
    ) {
      context.error_cause = toLogContext(error.cause as DomainError, depth + 1)
    } else {
      // Non-DomainError cause (e.g., third-party Error)
      context.error_cause = {
        type: typeof error.cause,
        value: String(error.cause),
      }
    }
  }

  return context
}

/**
 * Convert a DomainError to flat log context for Grafana Loki labels.
 * Flattens nested context to single-level key-value pairs.
 *
 * Note: Only includes error_kind and error_message at top level.
 * Context fields are prefixed with `error_context_`.
 * Cause chains are NOT included (would create too many labels).
 *
 * @param error - The DomainError to convert
 * @returns Flat log context with string/number/boolean values only
 *
 * @example
 * import { toFlatLogContext } from '@jenova-marie/ts-rust-result/observability'
 *
 * const error = fileNotFound('/missing.txt')
 * const labels = toFlatLogContext(error)
 *
 * // {
 * //   error_kind: 'FileNotFound',
 * //   error_message: 'File not found: /missing.txt',
 * //   error_context_path: '/missing.txt'
 * // }
 *
 * @example
 * // Use with Grafana Loki
 * const pino = require('pino')
 * const logger = pino({
 *   transport: {
 *     target: 'pino-loki',
 *     options: {
 *       batching: true,
 *       interval: 5,
 *       host: 'https://loki.example.com'
 *     }
 *   }
 * })
 *
 * if (!result.ok) {
 *   logger.error(toFlatLogContext(result.error), 'Operation failed')
 * }
 */
export function toFlatLogContext(
  error: DomainError
): Record<string, string | number | boolean> {
  const flat: Record<string, string | number | boolean> = {
    error_kind: error.kind,
    error_message: error.message,
  }

  if (error.timestamp) {
    flat.error_timestamp = error.timestamp
  }

  // Flatten context to error_context_* keys
  if (error.context) {
    for (const [key, value] of Object.entries(error.context)) {
      const flatKey = `error_context_${key}`

      // Convert value to primitive
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        flat[flatKey] = value
      } else if (value !== null && value !== undefined) {
        // Stringify complex values
        flat[flatKey] = JSON.stringify(value)
      }
    }
  }

  return flat
}

/**
 * Extract high-cardinality fields from error context.
 * Use with caution in metrics/labels - can cause cardinality explosion.
 *
 * @param context - Error context object
 * @param allowedKeys - Whitelist of keys to extract (prevents unbounded cardinality)
 * @returns Extracted fields as string values
 *
 * @example
 * // Only extract specific safe fields
 * const labels = {
 *   error_kind: error.kind,
 *   ...extractHighCardinalityFields(error.context, ['operation', 'status'])
 * }
 */
export function extractHighCardinalityFields(
  context: Record<string, unknown> | undefined,
  allowedKeys: string[]
): Record<string, string> {
  if (!context) {
    return {}
  }

  const extracted: Record<string, string> = {}

  for (const key of allowedKeys) {
    if (key in context) {
      const value = context[key]
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        extracted[key] = String(value)
      }
    }
  }

  return extracted
}
