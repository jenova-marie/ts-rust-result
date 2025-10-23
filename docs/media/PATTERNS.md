# Result Patterns & Best Practices

This guide covers common patterns and best practices for using ts-rust-result in real-world applications, with a focus on avoiding type assertions and maintaining clean, type-safe code.

## Table of Contents

- [Domain-Specific Result Wrappers](#domain-specific-result-wrappers)
- [Union Error Types](#union-error-types)
- [Recursive Functions](#recursive-functions)
- [Error Composition](#error-composition)
- [Type Inference Tips](#type-inference-tips)

---

## Domain-Specific Result Wrappers

**Problem:** When using custom error types, you often need type assertions like `as Result<T, MyError>` everywhere.

**Solution:** Create domain-specific `ok()` and `err()` wrappers using `createDomainResult()`.

### Example: Config Module

```typescript
// config-result.ts
import { createDomainResult } from '@jenova-marie/ts-rust-result/helpers'
import type { ConfigError } from './config-errors.js'

// Create domain-specific helpers
const { ok, err, Result } = createDomainResult<ConfigError>()

// Export for use throughout your module
export { ok, err }
export type ConfigResult<T> = ReturnType<typeof Result<T>>
```

```typescript
// config-loader.ts
import { ok, err, type ConfigResult } from './config-result.js'
import { fileNotFound, invalidJSON } from './config-errors.js'

// ✅ Clean - no type assertions needed!
export function findConfigFile(fileName: string): ConfigResult<string> {
  const configPath = path.resolve(process.cwd(), fileName)

  if (!fs.existsSync(configPath)) {
    return err(fileNotFound(configPath))  // ✅ Type inferred correctly
  }

  return ok(configPath)  // ✅ Type inferred correctly
}

export function parseConfig(content: string): ConfigResult<Config> {
  try {
    return ok(JSON.parse(content))
  } catch (e) {
    return err(invalidJSON(content, String(e)))
  }
}
```

### Benefits

- ✅ No type assertions (`as Result<T, E>`) needed
- ✅ Consistent error type across your domain
- ✅ Better IDE autocomplete
- ✅ Centralized error type management

---

## Union Error Types

**Pattern:** Compose standard errors with custom domain errors using TypeScript unions.

### Example: Config Errors

```typescript
// config-errors.ts
import {
  type FileSystemError,
  type ParseError,
  type ValidationError,
  type DomainError,
  error,
  fileNotFound,
  invalidJSON
} from '@jenova-marie/ts-rust-result/errors'

// Custom domain errors
export interface MissingEnvVarError extends DomainError {
  readonly kind: 'MissingEnvVar'
  readonly varName: string
}

export interface InvalidEnvVarSyntaxError extends DomainError {
  readonly kind: 'InvalidEnvVarSyntax'
  readonly syntax: string
  readonly position: number
}

// Union of standard + custom errors
export type ConfigError =
  | FileSystemError
  | ParseError
  | ValidationError
  | MissingEnvVarError
  | InvalidEnvVarSyntaxError

// Re-export standard factories (already typed correctly)
export { fileNotFound, invalidJSON }

// Create custom error factories
export const missingEnvVar = (varName: string): MissingEnvVarError =>
  error('MissingEnvVar')
    .withMessage(`Missing required environment variable: ${varName}`)
    .withContext({ varName })
    .build() as MissingEnvVarError

export const invalidEnvVarSyntax = (
  syntax: string,
  position: number
): InvalidEnvVarSyntaxError =>
  error('InvalidEnvVarSyntax')
    .withMessage(`Invalid syntax in environment variable at position ${position}`)
    .withContext({ syntax, position })
    .build() as InvalidEnvVarSyntaxError
```

### Pattern Matching on Error Kinds

```typescript
import { type ConfigResult } from './config-result.js'

function handleConfigError(result: ConfigResult<Config>): void {
  if (result.ok) {
    console.log('Config loaded:', result.value)
    return
  }

  // TypeScript narrows result.error based on kind
  switch (result.error.kind) {
    case 'FileNotFound':
      console.error('Config file not found:', result.error.path)
      break

    case 'InvalidJSON':
      console.error('Invalid JSON:', result.error.parseError)
      break

    case 'MissingEnvVar':
      console.error('Missing env var:', result.error.varName)
      break

    case 'InvalidEnvVarSyntax':
      console.error('Bad syntax at', result.error.position)
      break

    default:
      console.error('Unknown error:', result.error)
  }
}
```

---

## Recursive Functions

**Pattern:** Recursive functions that return Results work cleanly with domain wrappers.

### Example: Tree Processing

```typescript
import { ok, err, type ConfigResult } from './config-result.js'
import { invalidFieldValue } from './config-errors.js'

interface ConfigNode {
  value: any
  children?: ConfigNode[]
}

function interpolateNode(node: ConfigNode): ConfigResult<ConfigNode> {
  // Process node value
  if (typeof node.value === 'string') {
    const result = interpolateEnvVars(node.value)
    if (!result.ok) return result  // ✅ Error flows through!
    node.value = result.value
  }

  // Recursively process children
  if (node.children) {
    const processed: ConfigNode[] = []

    for (const child of node.children) {
      const result = interpolateNode(child)  // Recursive call
      if (!result.ok) return result  // ✅ Error propagates up
      processed.push(result.value)
    }

    node.children = processed
  }

  return ok(node)  // ✅ Success flows through
}
```

### Key Points

- ✅ Child errors propagate without casting: `if (!result.ok) return result`
- ✅ TypeScript understands the error type through recursion
- ✅ No need for intermediate type annotations

---

## Error Composition

**Pattern:** Combine results from multiple operations that return different error types.

### Example: Multi-Step Pipeline

```typescript
import { type Result } from '@jenova-marie/ts-rust-result'
import { type FileSystemError } from '@jenova-marie/ts-rust-result/errors'
import { type ConfigResult } from './config-result.js'

// Different functions with different error types
function readConfigFile(path: string): Result<string, FileSystemError> {
  // ...
}

function parseAndValidate(content: string): ConfigResult<Config> {
  // ...
}

// Compose with explicit error handling
function loadConfig(path: string): ConfigResult<Config> {
  // Step 1: Read file (FileSystemError)
  const fileResult = readConfigFile(path)
  if (!fileResult.ok) {
    // Convert FileSystemError to ConfigError
    return err<ConfigError>(fileResult.error)
  }

  // Step 2: Parse & validate (ConfigError)
  const parseResult = parseAndValidate(fileResult.value)
  if (!parseResult.ok) return parseResult  // Already ConfigError

  return ok(parseResult.value)
}
```

### Alternative: Widen Error Type

```typescript
// If FileSystemError is already part of ConfigError union:
function loadConfig(path: string): ConfigResult<Config> {
  const fileResult = readConfigFile(path)
  if (!fileResult.ok) {
    // FileSystemError ⊆ ConfigError, so this works
    return fileResult  // ✅ Type widening
  }

  return parseAndValidate(fileResult.value)
}
```

---

## Type Inference Tips

### Tip 1: Explicit Generic on `err<E>()`

When returning custom errors, be explicit:

```typescript
// ✅ GOOD - Explicit error type
function loadFile(path: string): Result<string, ConfigError> {
  return err<ConfigError>(fileNotFound(path))
}

// ❌ BAD - Infers Result<never, Error> by default
function loadFile(path: string): Result<string, ConfigError> {
  return err(fileNotFound(path)) as Result<string, ConfigError>
}
```

### Tip 2: Let `ok()` Infer from Return Type

```typescript
// ✅ GOOD - ok() infers error type from function return type
function loadFile(path: string): Result<string, ConfigError> {
  return ok(content)  // Inferred as Result<string, ConfigError>
}
```

### Tip 3: Use Domain Wrappers

```typescript
// ✅ BEST - No generics needed at all!
const { ok, err } = createDomainResult<ConfigError>()

function loadFile(path: string): ConfigResult<string> {
  return err(fileNotFound(path))  // ✅ Clean!
}
```

### Tip 4: Error Propagation

```typescript
// ✅ When child and parent have same error type, return directly
function parent(): Result<X, ConfigError> {
  const childResult = child()  // Returns Result<Y, ConfigError>

  if (!childResult.ok) {
    return childResult  // ✅ No cast needed - same error type
  }

  return ok(transform(childResult.value))
}
```

---

## Performance Notes

### Type Assertions Have Zero Runtime Cost

```typescript
// These are compile-time only - no runtime cost
return err(error) as Result<never, ConfigError>
return result as ConfigResult<T>
```

TypeScript erases all type information during compilation, so type assertions don't affect performance.

### Domain Wrappers Are Inline

```typescript
// These wrapper functions are inlined by JavaScript engines
const { ok, err } = createDomainResult<ConfigError>()

// Compiles to the same code as:
baseOk(value)
baseErr(error)
```

Modern JavaScript engines inline these simple wrapper functions, so there's no performance penalty.

---

## Summary

1. **Use `createDomainResult<E>()`** for modules with custom error types
2. **Define error unions** combining standard + custom errors
3. **Return errors directly** in recursive functions when types match
4. **Be explicit with `err<E>()`** when needed, let `ok()` infer
5. **Pattern match on `error.kind`** for exhaustive error handling

These patterns eliminate type assertions while maintaining full type safety!
