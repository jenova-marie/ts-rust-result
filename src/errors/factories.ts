/**
 * Convenience factory functions for standard error types.
 * These shortcuts use the builder pattern internally for consistent behavior.
 *
 * All factories automatically capture stack traces based on NODE_ENV.
 */

import type {
  FileSystemError,
  ParseError,
  ValidationError,
  ValidationIssue,
  NetworkError,
  DatabaseError,
  AuthError,
  ConfigError,
  UnexpectedError,
} from './types.js'
import { error } from './builder.js'

// ============================================================================
// File System Error Factories
// ============================================================================

/**
 * Create a FileNotFound error.
 *
 * @param path - Path to the file that was not found
 * @returns FileNotFound error
 *
 * @example
 * return err(fileNotFound('/missing.txt'))
 */
export function fileNotFound(path: string): FileSystemError {
  return error('FileNotFound')
    .withMessage(`File not found: ${path}`)
    .withContext({ path })
    .build() as FileSystemError
}

/**
 * Create a FileReadError.
 *
 * @param path - Path to the file that failed to read
 * @param reason - Reason for the read failure
 * @returns FileReadError error
 *
 * @example
 * return err(fileReadError('/app.json', 'Permission denied'))
 */
export function fileReadError(path: string, reason: string): FileSystemError {
  return error('FileReadError')
    .withMessage(`Failed to read file '${path}': ${reason}`)
    .withContext({ path, reason })
    .build() as FileSystemError
}

/**
 * Create a FileWriteError.
 *
 * @param path - Path to the file that failed to write
 * @param reason - Reason for the write failure
 * @returns FileWriteError error
 *
 * @example
 * return err(fileWriteError('/output.log', 'Disk full'))
 */
export function fileWriteError(path: string, reason: string): FileSystemError {
  return error('FileWriteError')
    .withMessage(`Failed to write file '${path}': ${reason}`)
    .withContext({ path, reason })
    .build() as FileSystemError
}

/**
 * Create a PermissionDenied error.
 *
 * @param path - Path to the resource
 * @param operation - Operation that was denied (e.g., 'read', 'write', 'execute')
 * @returns PermissionDenied error
 *
 * @example
 * return err(permissionDenied('/etc/secrets', 'read'))
 */
export function permissionDenied(path: string, operation: string): FileSystemError {
  return error('PermissionDenied')
    .withMessage(`Permission denied: cannot ${operation} '${path}'`)
    .withContext({ path, operation })
    .build() as FileSystemError
}

// ============================================================================
// Parse Error Factories
// ============================================================================

/**
 * Create an InvalidJSON error.
 *
 * @param input - JSON string that failed to parse (will be truncated to 100 chars for logging)
 * @param parseError - Error message from the JSON parser
 * @returns InvalidJSON error
 *
 * @example
 * try {
 *   JSON.parse(input)
 * } catch (e) {
 *   return err(invalidJSON(input, String(e)))
 * }
 */
export function invalidJSON(input: string, parseError: string): ParseError {
  return error('InvalidJSON')
    .withMessage(`Invalid JSON: ${parseError}`)
    .withContext({
      input: input.substring(0, 100), // Truncate for logging
      parseError,
    })
    .build() as ParseError
}

/**
 * Create an InvalidYAML error.
 *
 * @param line - Line number where parse error occurred
 * @param column - Column number where parse error occurred
 * @param parseError - Error message from the YAML parser
 * @returns InvalidYAML error
 *
 * @example
 * return err(invalidYAML(42, 10, 'Unexpected token'))
 */
export function invalidYAML(line: number, column: number, parseError: string): ParseError {
  return error('InvalidYAML')
    .withMessage(`Invalid YAML at line ${line}, column ${column}: ${parseError}`)
    .withContext({ line, column, parseError })
    .build() as ParseError
}

/**
 * Create an InvalidXML error.
 *
 * @param parseError - Error message from the XML parser
 * @returns InvalidXML error
 *
 * @example
 * return err(invalidXML('Unclosed tag at line 15'))
 */
export function invalidXML(parseError: string): ParseError {
  return error('InvalidXML')
    .withMessage(`Invalid XML: ${parseError}`)
    .withContext({ parseError })
    .build() as ParseError
}

/**
 * Create an InvalidTOML error.
 *
 * @param parseError - Error message from the TOML parser
 * @returns InvalidTOML error
 *
 * @example
 * return err(invalidTOML('Invalid datetime format'))
 */
export function invalidTOML(parseError: string): ParseError {
  return error('InvalidTOML')
    .withMessage(`Invalid TOML: ${parseError}`)
    .withContext({ parseError })
    .build() as ParseError
}

// ============================================================================
// Validation Error Factories
// ============================================================================

/**
 * Create a SchemaValidation error.
 *
 * @param issues - Array of validation issues (typically from Zod or similar)
 * @returns SchemaValidation error
 *
 * @example
 * const issues = [
 *   { path: ['user', 'email'], message: 'Invalid email format' },
 *   { path: ['user', 'age'], message: 'Must be at least 18' }
 * ]
 * return err(schemaValidation(issues))
 */
export function schemaValidation(issues: ValidationIssue[]): ValidationError {
  return error('SchemaValidation')
    .withMessage(`Validation failed: ${issues.length} issue(s)`)
    .withContext({ issues })
    .skipStack() // Validation errors don't need stacks
    .build() as ValidationError
}

/**
 * Create a RequiredFieldMissing error.
 *
 * @param field - Name of the required field that was missing
 * @returns RequiredFieldMissing error
 *
 * @example
 * return err(requiredFieldMissing('email'))
 */
export function requiredFieldMissing(field: string): ValidationError {
  return error('RequiredFieldMissing')
    .withMessage(`Required field missing: ${field}`)
    .withContext({ field })
    .skipStack() // Expected validation error
    .build() as ValidationError
}

/**
 * Create an InvalidFieldValue error.
 *
 * @param field - Name of the field with invalid value
 * @param value - The invalid value (will be included in context)
 * @param expected - Description of what was expected
 * @returns InvalidFieldValue error
 *
 * @example
 * return err(invalidFieldValue('port', 'abc', 'number between 1-65535'))
 */
export function invalidFieldValue(field: string, value: unknown, expected: string): ValidationError {
  return error('InvalidFieldValue')
    .withMessage(`Invalid value for field '${field}': expected ${expected}`)
    .withContext({ field, value, expected })
    .skipStack() // Expected validation error
    .build() as ValidationError
}

/**
 * Create a TypeMismatch error.
 *
 * @param field - Name of the field with type mismatch
 * @param expected - Expected type
 * @param received - Received type
 * @returns TypeMismatch error
 *
 * @example
 * return err(typeMismatch('age', 'number', 'string'))
 */
export function typeMismatch(field: string, expected: string, received: string): ValidationError {
  return error('TypeMismatch')
    .withMessage(`Type mismatch for field '${field}': expected ${expected}, received ${received}`)
    .withContext({ field, expected, received })
    .skipStack() // Expected validation error
    .build() as ValidationError
}

// ============================================================================
// Network Error Factories
// ============================================================================

/**
 * Create a ConnectionFailed error.
 *
 * @param endpoint - The endpoint that failed to connect
 * @param reason - Reason for connection failure
 * @returns ConnectionFailed error
 *
 * @example
 * return err(connectionFailed('https://api.example.com', 'ECONNREFUSED'))
 */
export function connectionFailed(endpoint: string, reason: string): NetworkError {
  return error('ConnectionFailed')
    .withMessage(`Connection failed: ${endpoint} (${reason})`)
    .withContext({ endpoint, reason })
    .build() as NetworkError
}

/**
 * Create a Timeout error.
 *
 * @param endpoint - The endpoint that timed out
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns Timeout error
 *
 * @example
 * return err(timeout('https://slow-api.com', 5000))
 */
export function timeout(endpoint: string, timeoutMs: number): NetworkError {
  return error('Timeout')
    .withMessage(`Request timed out after ${timeoutMs}ms: ${endpoint}`)
    .withContext({ endpoint, timeoutMs })
    .build() as NetworkError
}

/**
 * Create a DNSResolutionFailed error.
 *
 * @param hostname - The hostname that failed to resolve
 * @returns DNSResolutionFailed error
 *
 * @example
 * return err(dnsResolutionFailed('nonexistent.example.com'))
 */
export function dnsResolutionFailed(hostname: string): NetworkError {
  return error('DNSResolutionFailed')
    .withMessage(`DNS resolution failed: ${hostname}`)
    .withContext({ hostname })
    .build() as NetworkError
}

/**
 * Create an HTTPError.
 *
 * @param url - The URL that returned an error status
 * @param statusCode - HTTP status code
 * @param statusText - HTTP status text
 * @returns HTTPError error
 *
 * @example
 * return err(httpError('https://api.example.com/users', 404, 'Not Found'))
 */
export function httpError(url: string, statusCode: number, statusText: string): NetworkError {
  return error('HTTPError')
    .withMessage(`HTTP ${statusCode} ${statusText}: ${url}`)
    .withContext({ url, statusCode, statusText })
    .build() as NetworkError
}

// ============================================================================
// Database Error Factories
// ============================================================================

/**
 * Create a DatabaseConnectionFailed error.
 *
 * @param database - Database identifier (name, connection string, etc.)
 * @param reason - Reason for connection failure
 * @returns DatabaseConnectionFailed error
 *
 * @example
 * return err(databaseConnectionFailed('postgres://localhost/mydb', 'Connection refused'))
 */
export function databaseConnectionFailed(database: string, reason: string): DatabaseError {
  return error('DatabaseConnectionFailed')
    .withMessage(`Database connection failed: ${database} (${reason})`)
    .withContext({ database, reason })
    .build() as DatabaseError
}

/**
 * Create a QueryFailed error.
 *
 * @param query - The SQL query that failed (truncated for logging)
 * @param reason - Reason for query failure
 * @returns QueryFailed error
 *
 * @example
 * return err(queryFailed('SELECT * FROM users WHERE id = ?', 'Syntax error'))
 */
export function queryFailed(query: string, reason: string): DatabaseError {
  return error('QueryFailed')
    .withMessage(`Query failed: ${reason}`)
    .withContext({
      query: query.substring(0, 200), // Truncate long queries
      reason,
    })
    .build() as DatabaseError
}

/**
 * Create a TransactionFailed error.
 *
 * @param reason - Reason for transaction failure
 * @returns TransactionFailed error
 *
 * @example
 * return err(transactionFailed('Deadlock detected'))
 */
export function transactionFailed(reason: string): DatabaseError {
  return error('TransactionFailed')
    .withMessage(`Transaction failed: ${reason}`)
    .withContext({ reason })
    .build() as DatabaseError
}

/**
 * Create a ConstraintViolation error.
 *
 * @param constraint - Name of the constraint that was violated
 * @param table - Table name (optional)
 * @returns ConstraintViolation error
 *
 * @example
 * return err(constraintViolation('unique_email', 'users'))
 */
export function constraintViolation(constraint: string, table?: string): DatabaseError {
  const message = table
    ? `Constraint violation: ${constraint} on table ${table}`
    : `Constraint violation: ${constraint}`

  return error('ConstraintViolation')
    .withMessage(message)
    .withContext({ constraint, table })
    .build() as DatabaseError
}

// ============================================================================
// Auth Error Factories
// ============================================================================

/**
 * Create an Unauthenticated error.
 *
 * @param resource - The resource that requires authentication (optional)
 * @returns Unauthenticated error
 *
 * @example
 * return err(unauthenticated('/api/users'))
 */
export function unauthenticated(resource?: string): AuthError {
  const message = resource
    ? `Authentication required to access: ${resource}`
    : 'Authentication required'

  return error('Unauthenticated')
    .withMessage(message)
    .withContext({ resource })
    .build() as AuthError
}

/**
 * Create an Unauthorized error.
 *
 * @param resource - The resource that was unauthorized
 * @param requiredPermission - Permission that was required
 * @returns Unauthorized error
 *
 * @example
 * return err(unauthorized('/admin/users', 'admin:write'))
 */
export function unauthorized(resource: string, requiredPermission: string): AuthError {
  return error('Unauthorized')
    .withMessage(`Unauthorized: '${requiredPermission}' permission required for ${resource}`)
    .withContext({ resource, requiredPermission })
    .build() as AuthError
}

/**
 * Create a TokenExpired error.
 *
 * @param tokenType - Type of token that expired (e.g., 'access_token', 'refresh_token')
 * @param expiredAt - Timestamp when token expired (optional)
 * @returns TokenExpired error
 *
 * @example
 * return err(tokenExpired('access_token', 1234567890))
 */
export function tokenExpired(tokenType: string, expiredAt?: number): AuthError {
  const message = expiredAt
    ? `${tokenType} expired at ${new Date(expiredAt).toISOString()}`
    : `${tokenType} expired`

  return error('TokenExpired')
    .withMessage(message)
    .withContext({ tokenType, expiredAt })
    .build() as AuthError
}

/**
 * Create an InvalidCredentials error.
 *
 * @returns InvalidCredentials error
 *
 * @example
 * return err(invalidCredentials())
 */
export function invalidCredentials(): AuthError {
  return error('InvalidCredentials')
    .withMessage('Invalid credentials')
    .build() as AuthError
}

// ============================================================================
// Config Error Factories
// ============================================================================

/**
 * Create a MissingConfig error.
 *
 * @param configKey - The config key that was missing
 * @returns MissingConfig error
 *
 * @example
 * return err(missingConfig('DATABASE_URL'))
 */
export function missingConfig(configKey: string): ConfigError {
  return error('MissingConfig')
    .withMessage(`Missing configuration: ${configKey}`)
    .withContext({ configKey })
    .build() as ConfigError
}

/**
 * Create an InvalidConfig error.
 *
 * @param configKey - The config key with invalid value
 * @param reason - Reason why the config is invalid
 * @returns InvalidConfig error
 *
 * @example
 * return err(invalidConfig('PORT', 'Must be a number between 1-65535'))
 */
export function invalidConfig(configKey: string, reason: string): ConfigError {
  return error('InvalidConfig')
    .withMessage(`Invalid configuration for '${configKey}': ${reason}`)
    .withContext({ configKey, reason })
    .build() as ConfigError
}

/**
 * Create a ConfigParseError.
 *
 * @param configFile - Path to the config file that failed to parse
 * @param parseError - Error message from the parser
 * @returns ConfigParseError error
 *
 * @example
 * return err(configParseError('/app/config.json', 'Unexpected token at line 5'))
 */
export function configParseError(configFile: string, parseError: string): ConfigError {
  return error('ConfigParseError')
    .withMessage(`Failed to parse config file '${configFile}': ${parseError}`)
    .withContext({ configFile, parseError })
    .build() as ConfigError
}

// ============================================================================
// Unexpected Error Factory
// ============================================================================

/**
 * Create an Unexpected error (typically from caught exceptions).
 * This is a low-level factory - prefer using fromError() from conversion.ts
 * for automatic Error instance handling.
 *
 * @param message - Error message
 * @param originalError - The original error/exception (optional)
 * @returns Unexpected error
 *
 * @example
 * try {
 *   dangerousOperation()
 * } catch (e) {
 *   return err(unexpected('Operation failed', e))
 * }
 */
export function unexpected(message: string, originalError?: unknown): UnexpectedError {
  return error('Unexpected')
    .withMessage(message)
    .withContext({ originalError })
    .captureStack() // Always capture stack for unexpected errors
    .build() as UnexpectedError
}
