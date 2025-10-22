/**
 * Base interface for all domain errors in the Jenova-Marie ecosystem.
 * All errors are plain objects (not Error classes) for JSON serialization,
 * lightweight representation, and structural typing.
 */
export interface DomainError {
  /** Discriminator for type narrowing (e.g., 'FileNotFound', 'InvalidJSON') */
  readonly kind: string

  /** Human-readable error message */
  readonly message: string

  /** Structured context for logging/observability (arbitrary key-value pairs) */
  readonly context?: Record<string, unknown>

  /** Error that caused this error (supports wrapping third-party errors) */
  readonly cause?: DomainError | unknown

  /** Stack trace (optional - captured in dev/test, skipped in production) */
  readonly stack?: string

  /** Timestamp when error was created (milliseconds since epoch) */
  readonly timestamp?: number
}

// ============================================================================
// File System Errors
// ============================================================================

/**
 * File system operation errors (read, write, permissions, not found).
 */
export type FileSystemError =
  | FileNotFoundError
  | FileReadError
  | FileWriteError
  | PermissionDeniedError

export interface FileNotFoundError extends DomainError {
  readonly kind: 'FileNotFound'
  readonly path: string
}

export interface FileReadError extends DomainError {
  readonly kind: 'FileReadError'
  readonly path: string
  readonly reason: string
}

export interface FileWriteError extends DomainError {
  readonly kind: 'FileWriteError'
  readonly path: string
  readonly reason: string
}

export interface PermissionDeniedError extends DomainError {
  readonly kind: 'PermissionDenied'
  readonly path: string
  readonly operation: string
}

// ============================================================================
// Parse Errors
// ============================================================================

/**
 * Errors from parsing structured data formats (JSON, YAML, XML, TOML).
 */
export type ParseError =
  | InvalidJSONError
  | InvalidYAMLError
  | InvalidXMLError
  | InvalidTOMLError

export interface InvalidJSONError extends DomainError {
  readonly kind: 'InvalidJSON'
  readonly input: string // Truncated for logging
  readonly parseError: string
}

export interface InvalidYAMLError extends DomainError {
  readonly kind: 'InvalidYAML'
  readonly line: number
  readonly column: number
  readonly parseError: string
}

export interface InvalidXMLError extends DomainError {
  readonly kind: 'InvalidXML'
  readonly parseError: string
}

export interface InvalidTOMLError extends DomainError {
  readonly kind: 'InvalidTOML'
  readonly parseError: string
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Schema validation, required fields, type mismatches, invalid values.
 */
export type ValidationError =
  | SchemaValidationError
  | RequiredFieldMissingError
  | InvalidFieldValueError
  | TypeMismatchError

export interface ValidationIssue {
  readonly path: string[]
  readonly message: string
}

export interface SchemaValidationError extends DomainError {
  readonly kind: 'SchemaValidation'
  readonly issues: ValidationIssue[]
}

export interface RequiredFieldMissingError extends DomainError {
  readonly kind: 'RequiredFieldMissing'
  readonly field: string
}

export interface InvalidFieldValueError extends DomainError {
  readonly kind: 'InvalidFieldValue'
  readonly field: string
  readonly value: unknown
  readonly expected: string
}

export interface TypeMismatchError extends DomainError {
  readonly kind: 'TypeMismatch'
  readonly field: string
  readonly expected: string
  readonly received: string
}

// ============================================================================
// Network Errors
// ============================================================================

/**
 * Network operation errors (connection, timeout, DNS, HTTP).
 */
export type NetworkError =
  | ConnectionFailedError
  | TimeoutError
  | DNSResolutionFailedError
  | HTTPError

export interface ConnectionFailedError extends DomainError {
  readonly kind: 'ConnectionFailed'
  readonly endpoint: string
  readonly reason: string
}

export interface TimeoutError extends DomainError {
  readonly kind: 'Timeout'
  readonly endpoint: string
  readonly timeoutMs: number
}

export interface DNSResolutionFailedError extends DomainError {
  readonly kind: 'DNSResolutionFailed'
  readonly hostname: string
}

export interface HTTPError extends DomainError {
  readonly kind: 'HTTPError'
  readonly url: string
  readonly statusCode: number
  readonly statusText: string
}

// ============================================================================
// Database Errors
// ============================================================================

/**
 * Database operation errors (connection, query, transaction, constraints).
 */
export type DatabaseError =
  | DatabaseConnectionFailedError
  | QueryFailedError
  | TransactionFailedError
  | ConstraintViolationError

export interface DatabaseConnectionFailedError extends DomainError {
  readonly kind: 'DatabaseConnectionFailed'
  readonly database: string
  readonly reason: string
}

export interface QueryFailedError extends DomainError {
  readonly kind: 'QueryFailed'
  readonly query: string
  readonly reason: string
}

export interface TransactionFailedError extends DomainError {
  readonly kind: 'TransactionFailed'
  readonly reason: string
}

export interface ConstraintViolationError extends DomainError {
  readonly kind: 'ConstraintViolation'
  readonly constraint: string
  readonly table?: string
}

// ============================================================================
// Auth Errors
// ============================================================================

/**
 * Authentication and authorization errors.
 */
export type AuthError =
  | UnauthenticatedError
  | UnauthorizedError
  | TokenExpiredError
  | InvalidCredentialsError

export interface UnauthenticatedError extends DomainError {
  readonly kind: 'Unauthenticated'
  readonly resource?: string
}

export interface UnauthorizedError extends DomainError {
  readonly kind: 'Unauthorized'
  readonly resource: string
  readonly requiredPermission: string
}

export interface TokenExpiredError extends DomainError {
  readonly kind: 'TokenExpired'
  readonly tokenType: string
  readonly expiredAt?: number
}

export interface InvalidCredentialsError extends DomainError {
  readonly kind: 'InvalidCredentials'
}

// ============================================================================
// Config Errors
// ============================================================================

/**
 * Configuration loading and validation errors.
 */
export type ConfigError =
  | MissingConfigError
  | InvalidConfigError
  | ConfigParseError

export interface MissingConfigError extends DomainError {
  readonly kind: 'MissingConfig'
  readonly configKey: string
}

export interface InvalidConfigError extends DomainError {
  readonly kind: 'InvalidConfig'
  readonly configKey: string
  readonly reason: string
}

export interface ConfigParseError extends DomainError {
  readonly kind: 'ConfigParseError'
  readonly configFile: string
  readonly parseError: string
}

// ============================================================================
// Unexpected Errors
// ============================================================================

/**
 * Catch-all for unexpected errors (usually from third-party code).
 * Always includes stack trace and original error for debugging.
 */
export interface UnexpectedError extends DomainError {
  readonly kind: 'Unexpected'
  readonly originalError?: unknown
}

// ============================================================================
// Union of All Standard Errors
// ============================================================================

/**
 * Union type of all standard error categories.
 * Use this for functions that can return multiple error types.
 */
export type StandardError =
  | FileSystemError
  | ParseError
  | ValidationError
  | NetworkError
  | DatabaseError
  | AuthError
  | ConfigError
  | UnexpectedError
