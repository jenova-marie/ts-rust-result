/**
 * Stack trace capture utilities with NODE_ENV awareness.
 *
 * Strategy:
 * - In development/test: Capture full stack traces for debugging
 * - In production: Skip stack traces to reduce memory/CPU overhead
 * - Configurable override for testing or debugging production issues
 */

/**
 * Global override for stack capture behavior.
 * - undefined: Use NODE_ENV-based detection
 * - true: Always capture stacks (even in production)
 * - false: Never capture stacks (even in dev/test)
 */
let captureStacksOverride: boolean | undefined

/**
 * Set global override for stack capture behavior.
 * Useful for testing or debugging production issues.
 *
 * @param enabled - true to always capture, false to never capture
 *
 * @example
 * // Temporarily enable stacks in production for debugging
 * setCaptureStacks(true)
 * const error = fileNotFound('/missing.txt')
 * setCaptureStacks(undefined) // Reset to NODE_ENV behavior
 */
export function setCaptureStacks(enabled: boolean | undefined): void {
  captureStacksOverride = enabled
}

/**
 * Get current stack capture override setting.
 */
export function getCaptureStacksOverride(): boolean | undefined {
  return captureStacksOverride
}

/**
 * Determine if stacks should be captured based on NODE_ENV.
 * Returns true for development and test environments.
 */
export function shouldCaptureStack(): boolean {
  const env = process.env.NODE_ENV
  return env === 'development' || env === 'test'
}

/**
 * Get effective stack capture setting (respects override).
 * This is the main function used by the builder to decide whether to capture.
 *
 * @returns true if stacks should be captured
 */
export function getCaptureStacks(): boolean {
  // Override takes precedence
  if (captureStacksOverride !== undefined) {
    return captureStacksOverride
  }
  // Fall back to NODE_ENV detection
  return shouldCaptureStack()
}

/**
 * Capture current stack trace, excluding this function's frame.
 * Returns empty string in production (unless override is set).
 *
 * Implementation notes:
 * - Creates a temporary Error to access stack trace
 * - Removes first 2 lines (Error message + captureStack frame)
 * - Returns remaining frames as newline-separated string
 *
 * @returns Stack trace string or empty string if capture disabled
 *
 * @example
 * const stack = captureStack()
 * // In dev:
 * // "    at fileNotFound (errors/factories.ts:42:10)
 * //     at loadConfig (config.ts:15:12)
 * //     at main (index.ts:8:5)"
 * // In production: ""
 */
export function captureStack(): string {
  if (!getCaptureStacks()) {
    return ''
  }

  const stack = new Error().stack || ''

  // Remove first 2 lines:
  // Line 0: "Error" (no message)
  // Line 1: "    at captureStack (...)"
  const lines = stack.split('\n')
  return lines.slice(2).join('\n')
}

/**
 * Capture stack trace from an existing Error instance.
 * Useful when wrapping third-party errors that already have stacks.
 *
 * @param error - Error instance to extract stack from
 * @returns Stack trace string or empty string if not available/disabled
 *
 * @example
 * try {
 *   JSON.parse(badJSON)
 * } catch (e) {
 *   const error = fromError(e)
 *   // error.stack contains original JSON parse stack
 * }
 */
export function captureStackFromError(error: Error): string {
  if (!getCaptureStacks()) {
    return ''
  }
  return error.stack || ''
}
