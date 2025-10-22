/**
 * Tests for domain-specific Result helpers (v2.2.0)
 */

import { describe, it, expect } from 'vitest'
import { createDomainResult, type DomainResult } from '../src/helpers.js'
import { type DomainError } from '../src/errors/types.js'
import { fileNotFound, invalidJSON } from '../src/errors/factories.js'

// Define test error types
interface CustomError extends DomainError {
  kind: 'CustomError'
  customField: string
}

type TestError =
  | ReturnType<typeof fileNotFound>
  | ReturnType<typeof invalidJSON>
  | CustomError

describe('createDomainResult', () => {
  const { ok, err } = createDomainResult<TestError>()

  it('creates ok results with correct type', () => {
    const result = ok('success')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('success')
    }
  })

  it('creates err results with correct type', () => {
    const error = fileNotFound('/missing.txt')
    const result = err(error)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe(error)
      expect(result.error.kind).toBe('FileNotFound')
    }
  })

  it('preserves error properties', () => {
    const error = fileNotFound('/config.json')
    const result = err(error)

    if (!result.ok) {
      expect(result.error.kind).toBe('FileNotFound')
      expect(result.error.context?.path).toBe('/config.json')
      expect(result.error.message).toContain('config.json')
    }
  })

  it('works with union error types', () => {
    const fileError = fileNotFound('/test.txt')
    const jsonError = invalidJSON('{}', 'Unexpected token')

    const result1 = err(fileError)
    const result2 = err(jsonError)

    expect(result1.ok).toBe(false)
    expect(result2.ok).toBe(false)

    if (!result1.ok) {
      expect(result1.error.kind).toBe('FileNotFound')
    }
    if (!result2.ok) {
      expect(result2.error.kind).toBe('InvalidJSON')
    }
  })

  it('type inference works correctly', () => {
    // This test primarily verifies TypeScript compilation
    function loadFile(path: string): DomainResult<string, TestError> {
      if (path === '') {
        return err(fileNotFound(path))  // Should compile without cast
      }
      return ok('file contents')  // Should compile without cast
    }

    const result = loadFile('/test.txt')
    expect(result.ok).toBe(true)

    const errorResult = loadFile('')
    expect(errorResult.ok).toBe(false)
  })

  it('supports recursive functions', () => {
    interface Node {
      value: string
      children?: Node[]
    }

    function processNode(node: Node): DomainResult<Node, TestError> {
      if (node.value === 'error') {
        return err(invalidJSON(node.value, 'Invalid node'))
      }

      if (node.children) {
        for (const child of node.children) {
          const result = processNode(child)
          if (!result.ok) return result  // Type flows through
        }
      }

      return ok(node)
    }

    const validNode: Node = { value: 'valid', children: [{ value: 'child' }] }
    const result = processNode(validNode)
    expect(result.ok).toBe(true)

    const errorNode: Node = { value: 'valid', children: [{ value: 'error' }] }
    const errorResult = processNode(errorNode)
    expect(errorResult.ok).toBe(false)
  })

  it('eliminates need for type assertions', () => {
    // Before helpers (needed assertions):
    // return err(error) as Result<never, TestError>
    // return ok(value) as Result<string, TestError>

    // After helpers (no assertions needed):
    const result1 = ok('test')
    const result2 = err(fileNotFound('/test'))

    expect(result1.ok).toBe(true)
    expect(result2.ok).toBe(false)
  })
})

describe('DomainResult type utility', () => {
  it('creates correct Result types', () => {
    type MyResult<T> = DomainResult<T, TestError>

    const okResult: MyResult<number> = { ok: true, value: 42, _isr: true }
    const errResult: MyResult<number> = {
      ok: false,
      error: fileNotFound('/test'),
      _isr: true
    }

    expect(okResult.ok).toBe(true)
    expect(errResult.ok).toBe(false)
  })
})

describe('Real-world usage patterns', () => {
  // Simulate a config module with domain-specific errors
  interface MissingEnvVarError extends DomainError {
    kind: 'MissingEnvVar'
    varName: string
  }

  type ConfigError =
    | ReturnType<typeof fileNotFound>
    | ReturnType<typeof invalidJSON>
    | MissingEnvVarError

  const { ok: configOk, err: configErr } = createDomainResult<ConfigError>()
  type ConfigResult<T> = DomainResult<T, ConfigError>

  const missingEnvVar = (varName: string): MissingEnvVarError => ({
    kind: 'MissingEnvVar',
    message: `Missing environment variable: ${varName}`,
    varName
  })

  function loadEnvVar(name: string): ConfigResult<string> {
    const value = process.env[name]
    if (!value) {
      return configErr(missingEnvVar(name))
    }
    return configOk(value)
  }

  function loadConfigFile(path: string): ConfigResult<object> {
    if (path === '') {
      return configErr(fileNotFound(path))
    }
    return configOk({ loaded: true })
  }

  it('works in real config loading scenario', () => {
    const result1 = loadEnvVar('NONEXISTENT_VAR')
    expect(result1.ok).toBe(false)
    if (!result1.ok) {
      expect(result1.error.kind).toBe('MissingEnvVar')
    }

    const result2 = loadConfigFile('')
    expect(result2.ok).toBe(false)
    if (!result2.ok) {
      expect(result2.error.kind).toBe('FileNotFound')
    }

    const result3 = loadConfigFile('/config.json')
    expect(result3.ok).toBe(true)
  })

  it('supports pattern matching on error kinds', () => {
    const result = loadEnvVar('MISSING')

    if (!result.ok) {
      switch (result.error.kind) {
        case 'MissingEnvVar':
          expect(result.error.varName).toBe('MISSING')
          break
        case 'FileNotFound':
          expect.fail('Should not be FileNotFound')
          break
        case 'InvalidJSON':
          expect.fail('Should not be InvalidJSON')
          break
        default:
          expect.fail('Unexpected error kind')
      }
    }
  })
})
