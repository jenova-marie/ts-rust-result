# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@jenova-marie/ts-rust-result` is a lightweight, zero-dependency TypeScript library that implements Rust's `Result` type pattern for type-safe error handling in JavaScript/TypeScript. The library treats errors as values rather than exceptions, providing explicit, functional error handling with full TypeScript support.

## Development Commands

### Building
```bash
pnpm build              # Compile TypeScript to dist/
pnpm dev                # Watch mode compilation
pnpm clean              # Remove dist/ directory
```

### Testing
```bash
pnpm test               # Run all tests with Vitest
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Generate coverage report
pnpm test:tsx           # Test tsx compatibility (smoke test)
```

### Quality & Documentation
```bash
pnpm lint               # Lint TypeScript files with ESLint
pnpm docs               # Generate TypeDoc documentation
```

### Publishing Workflow

**Local Package Build (for local consumption):**
```bash
pnpm pack               # Build release-ready package locally (.tgz)
                        # Pipeline: clean → docs → build → test → pack
                        # Creates: jenova-marie-ts-rust-result-X.Y.Z.tgz
```

Install the local package in another project:
```bash
cd ../other-project
pnpm add ../ts-rust-result/jenova-marie-ts-rust-result-*.tgz
```

**NPM Publish (via GitHub Actions):**
```bash
pnpm make               # Complete build pipeline + publish to npm
                        # Pipeline: docs → build → test → npm publish
```

Note: Publishing to npm happens via GitHub Actions. Use `pnpm pack` for local development and testing.

The `prepublishOnly` hook automatically runs `docs`, `build`, and `test` before publishing.

## Architecture & Core Concepts

### Type System

The library centers around three core types defined in `src/TsRustResult.ts`:

- **`Ok<T>`**: `{ ok: true; value: T; _isr: true }` - Successful result with value
- **`Err`**: `{ ok: false; error: Error; _isr: true }` - Error result
- **`Result<T>`**: `Ok<T> | Err` - Union type for either outcome

The `_isr` property is an internal marker ("is result") used to distinguish Result types from plain objects, particularly in `tryResult()` for automatic unwrapping.

### Function Categories

1. **Constructors**: `ok()`, `err()` - Create Result values
2. **Type Guards**: `isOk()`, `isErr()` - Type-safe discriminators
3. **Transformers**: `map()`, `mapErr()` - Functional composition
4. **Extractors**: `unwrap()` - Get value or throw
5. **Async Wrapper**: `tryResult()` - Convert promise rejections to Results
6. **Assertions**: `assert()`, `assertOr()`, `assertNotNil()` - Validation with configurable throwing behavior

### Design Patterns

**Function Design Philosophy** (from README):
- **Your functions**: Return `Result<T>` directly using `ok()` and `err()`
- **Third-party calls**: Wrap with `tryResult()` to convert exceptions
- **Anti-pattern**: Never wrap your own Result-returning functions in `tryResult()`

**Assertion Behavior**:
All assertion functions (`assert()`, `assertOr()`, `assertNotNil()`) default to `shouldThrow: true` to keep unit tests clean. They can return `Result<true>` or `Result<NonNullable<T>>` when `shouldThrow: false`.

### Testing Patterns

Tests use Jest with TypeScript and are located in `test/TsRustResult.test.ts`. Key patterns:

- Use type guards (`if (result.ok)`) to access values safely
- Test both success and error paths for each function
- Verify type narrowing works correctly with TypeScript
- Use `.toThrow()` for unwrap error cases
- Use `.toEqual()` for object comparisons

Example test structure:
```typescript
describe('functionName', () => {
    it('handles success case', () => {
        const result = ok(value);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value).toBe(expected);
        }
    });

    it('handles error case', () => {
        const result = err(new Error('test'));
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe(error);
        }
    });
});
```

## Code Organization

### Source Structure
- `src/TsRustResult.ts` - All core implementation (426 lines with docs)
- `src/index.ts` - Re-exports everything from TsRustResult.ts
- Single file architecture keeps the zero-dependency promise simple

### Build Configuration
- **TypeScript**: ES2020 target, strict mode, ES modules
- **Output**: `dist/` directory with `.js`, `.d.ts`, and source maps
- **Package exports**: Configured for both import and require (though ES modules)
- **Test exclusion**: `*.test.ts` and `*.spec.ts` excluded from build

### Documentation
- TypeDoc generates API docs to `docs/` directory
- Configuration in `typedoc.json`
- Extensive JSDoc comments with examples in source code
- README.md has comprehensive usage examples and philosophy

## Important Implementation Details

### tryResult() Unwrapping Behavior
`tryResult()` automatically unwraps nested Results (line 291):
```typescript
if (value && value._isr) return ok(unwrap(value));
```
This prevents `Result<Result<T>>` when wrapping functions that already return Results.

### Error Normalization
`tryResult()` ensures errors are always Error instances (line 295):
```typescript
const error = e instanceof Error ? e : new Error(String(e));
```

### Type Safety
The library leverages TypeScript's discriminated unions and type guards to ensure type-safe access to values, preventing access to `result.value` without checking `result.ok` first.

## Development Notes

- **Package Manager**: pnpm 10.11.0 (required)
- **Node Version**: >=18
- **License**: GPL-3.0
- **Zero Dependencies**: Keep it that way - no runtime dependencies allowed
- **ES Modules**: The project uses ES modules exclusively (.js extensions in imports)
- **Author**: Jenova Marie (Pippa)
