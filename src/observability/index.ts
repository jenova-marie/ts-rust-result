/**
 * Observability helpers for ts-rust-result errors.
 *
 * This module provides utilities for integrating DomainErrors with:
 * - Structured logging (Pino, Winston, Grafana Loki)
 * - Distributed tracing (OpenTelemetry)
 * - Metrics (Prometheus)
 *
 * Import from '@jenova-marie/ts-rust-result/observability'
 *
 * @example
 * import { toLogContext, toSpanAttributes, toMetricLabels } from '@jenova-marie/ts-rust-result/observability'
 *
 * // Logging
 * logger.error(toLogContext(result.error), 'Operation failed')
 *
 * // Tracing
 * span?.setAttributes(toSpanAttributes(result.error))
 *
 * // Metrics
 * errorCounter.inc(toMetricLabels(result.error))
 */

// Re-export logging helpers
export * from './logging'

// Re-export tracing helpers
export * from './tracing'

// Re-export metrics helpers
export * from './metrics'
