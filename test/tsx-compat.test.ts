/**
 * tsx Compatibility Test
 *
 * This test verifies that the package can be imported and used correctly
 * when executed via tsx (TypeScript execution environment).
 *
 * Issue: tsx had trouble resolving named exports from ESM builds without
 * "type": "module" in package.json.
 */

import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr, unwrap, map, mapErr, tryResult, assert, assertOr, assertNotNil, type Result, type Ok, type Err } from '../src/index.js'

describe('tsx compatibility', () => {
  it('should import all named exports correctly', () => {
    // Verify all functions are imported
    expect(typeof ok).toBe('function')
    expect(typeof err).toBe('function')
    expect(typeof isOk).toBe('function')
    expect(typeof isErr).toBe('function')
    expect(typeof unwrap).toBe('function')
    expect(typeof map).toBe('function')
    expect(typeof mapErr).toBe('function')
    expect(typeof tryResult).toBe('function')
    expect(typeof assert).toBe('function')
    expect(typeof assertOr).toBe('function')
    expect(typeof assertNotNil).toBe('function')
  })

  it('should create and use Ok results', () => {
    const result = ok(42)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe(42)
    }
  })

  it('should create and use Err results', () => {
    const result = err(new Error('test error'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe('test error')
    }
  })

  it('should work with type guards', () => {
    const okResult = ok('success')
    const errResult = err(new Error('failure'))

    expect(isOk(okResult)).toBe(true)
    expect(isErr(okResult)).toBe(false)

    expect(isOk(errResult)).toBe(false)
    expect(isErr(errResult)).toBe(true)
  })

  it('should work with async tryResult', async () => {
    const successResult = await tryResult(async () => {
      return 'async success'
    })

    expect(successResult.ok).toBe(true)
    if (successResult.ok) {
      expect(successResult.value).toBe('async success')
    }

    const errorResult = await tryResult(async () => {
      throw new Error('async error')
    })

    expect(errorResult.ok).toBe(false)
    if (!errorResult.ok) {
      expect(errorResult.error.message).toBe('async error')
    }
  })

  it('should work with map and mapErr', () => {
    const okResult = ok(5)
    const mapped = map(okResult, x => x * 2)

    expect(mapped.ok).toBe(true)
    if (mapped.ok) {
      expect(mapped.value).toBe(10)
    }

    const errResult = err(new Error('original'))
    const mappedErr = mapErr(errResult, e => new Error(`wrapped: ${e.message}`))

    expect(mappedErr.ok).toBe(false)
    if (!mappedErr.ok) {
      expect(mappedErr.error.message).toBe('wrapped: original')
    }
  })
})
