/**
 * Prometheus metrics helpers for converting errors to metric labels.
 * Use with caution - high cardinality labels can cause performance issues.
 */

import type { DomainError } from '../errors/types.js'

/**
 * Convert a DomainError to Prometheus metric labels.
 * Only includes error_kind by default to prevent cardinality explosion.
 *
 * @param error - The DomainError to convert
 * @returns Metric labels (all values are strings for Prometheus compatibility)
 *
 * @example
 * import * as promClient from 'prom-client'
 * import { toMetricLabels } from '@jenova-marie/ts-rust-result/observability'
 *
 * const errorCounter = new promClient.Counter({
 *   name: 'app_errors_total',
 *   help: 'Total application errors by kind',
 *   labelNames: ['error_kind']
 * })
 *
 * const result = loadConfig()
 * if (!result.ok) {
 *   errorCounter.inc(toMetricLabels(result.error))
 * }
 *
 * @example
 * // Metrics output:
 * // app_errors_total{error_kind="FileNotFound"} 5
 * // app_errors_total{error_kind="InvalidJSON"} 2
 */
export function toMetricLabels(error: DomainError): Record<string, string> {
  return {
    error_kind: error.kind,
  }
}

/**
 * Convert error to metric labels with additional safe context fields.
 * Use this when you need more granularity but want to control cardinality.
 *
 * @param error - The DomainError to convert
 * @param allowedContextKeys - Whitelist of context keys to include as labels (prevents unbounded cardinality)
 * @returns Metric labels including error_kind and whitelisted context fields
 *
 * @example
 * import { toMetricLabelsWithContext } from '@jenova-marie/ts-rust-result/observability'
 *
 * const errorCounter = new promClient.Counter({
 *   name: 'app_errors_total',
 *   help: 'Total application errors',
 *   labelNames: ['error_kind', 'operation', 'status']
 * })
 *
 * const error = error('QueryFailed')
 *   .withMessage('Database query failed')
 *   .withContext({ operation: 'select', status: 'timeout', query: 'SELECT * ...' })
 *   .build()
 *
 * // Only include 'operation' and 'status' (not 'query' which has high cardinality)
 * errorCounter.inc(toMetricLabelsWithContext(error, ['operation', 'status']))
 *
 * // Metrics:
 * // app_errors_total{error_kind="QueryFailed",operation="select",status="timeout"} 3
 */
export function toMetricLabelsWithContext(
  error: DomainError,
  allowedContextKeys: string[]
): Record<string, string> {
  const labels: Record<string, string> = {
    error_kind: error.kind,
  }

  if (error.context) {
    for (const key of allowedContextKeys) {
      if (key in error.context) {
        const value = error.context[key]

        // Only include primitive values
        if (typeof value === 'string') {
          labels[key] = value
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          labels[key] = String(value)
        }
      }
    }
  }

  return labels
}

/**
 * Record error in Prometheus counter with automatic labeling.
 * Convenience wrapper for common error counting pattern.
 *
 * @param counter - Prometheus counter instance
 * @param error - The DomainError to record
 * @param allowedContextKeys - Optional whitelist of context keys for labels
 *
 * @example
 * import * as promClient from 'prom-client'
 * import { recordErrorMetric } from '@jenova-marie/ts-rust-result/observability'
 *
 * const errorCounter = new promClient.Counter({
 *   name: 'app_errors_total',
 *   help: 'Total application errors',
 *   labelNames: ['error_kind', 'operation']
 * })
 *
 * const result = performOperation()
 * if (!result.ok) {
 *   recordErrorMetric(errorCounter, result.error, ['operation'])
 * }
 */
export function recordErrorMetric(
  counter: { inc(labels: Record<string, string>, value?: number): void },
  error: DomainError,
  allowedContextKeys?: string[]
): void {
  const labels = allowedContextKeys
    ? toMetricLabelsWithContext(error, allowedContextKeys)
    : toMetricLabels(error)

  counter.inc(labels)
}

/**
 * Create error kind enum for consistent metric labels.
 * Generates a const object with error kinds as keys.
 *
 * @param errorKinds - Array of error kind strings
 * @returns Frozen object with error kinds
 *
 * @example
 * import { createErrorKindEnum } from '@jenova-marie/ts-rust-result/observability'
 *
 * const ErrorKind = createErrorKindEnum([
 *   'FileNotFound',
 *   'FileReadError',
 *   'InvalidJSON',
 *   'SchemaValidation'
 * ])
 *
 * // Use in counter definition
 * const errorCounter = new promClient.Counter({
 *   name: 'app_errors_total',
 *   help: 'Total application errors',
 *   labelNames: ['error_kind']
 * })
 *
 * // Autocomplete-friendly error recording
 * if (result.error.kind === ErrorKind.FileNotFound) {
 *   errorCounter.inc({ error_kind: ErrorKind.FileNotFound })
 * }
 */
export function createErrorKindEnum<T extends string>(
  errorKinds: readonly T[]
): Readonly<Record<T, T>> {
  const enumObj = {} as Record<T, T>

  for (const kind of errorKinds) {
    enumObj[kind] = kind
  }

  return Object.freeze(enumObj)
}

/**
 * Guidance on Prometheus label cardinality.
 *
 * WARNING: High cardinality labels (unbounded values like file paths, user IDs, URLs)
 * can cause serious performance issues in Prometheus.
 *
 * Safe labels (low cardinality):
 * - error_kind (limited to your error types)
 * - operation (limited set like 'read', 'write', 'delete')
 * - status (limited set like 'success', 'failure', 'timeout')
 * - method (HTTP methods: GET, POST, etc.)
 * - code (HTTP status codes: 200, 404, etc.)
 *
 * Unsafe labels (high cardinality):
 * - path (unbounded file paths)
 * - url (unbounded URLs)
 * - user_id (unbounded user identifiers)
 * - query (unbounded SQL queries)
 * - error_message (unbounded text)
 *
 * Best practices:
 * 1. Use error_kind as primary label (low cardinality by design)
 * 2. Add 1-2 additional low-cardinality labels if needed (operation, status)
 * 3. Store high-cardinality data in logs/traces, not metrics
 * 4. Use allowedContextKeys whitelist to prevent accidental high-cardinality labels
 *
 * @example
 * // ✅ Good - low cardinality
 * const labels = toMetricLabelsWithContext(error, ['operation', 'status'])
 * // Possible values: {operation: 'read'|'write'|'delete', status: 'success'|'failure'}
 *
 * @example
 * // ❌ Bad - high cardinality
 * const labels = toMetricLabelsWithContext(error, ['path', 'user_id'])
 * // Unbounded values - will create millions of time series!
 */
export const LABEL_CARDINALITY_GUIDANCE = {
  safe: ['error_kind', 'operation', 'status', 'method', 'code'] as const,
  unsafe: ['path', 'url', 'user_id', 'query', 'message'] as const,
} as const
