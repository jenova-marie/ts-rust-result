import { describe, it, expect } from 'vitest'
import {
    ok,
    err,
    isOk,
    isErr,
    unwrap,
    map,
    mapErr,
    tryResult,
    assert,
    assertOr,
    assertNotNil,
    type Result,
    type Ok,
    type Err
} from '../src/index'

describe('RustResult Core Functions', () => {
    describe('ok', () => {
        it('creates successful result', () => {
            const result = ok('test');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe('test');
            }
        });

        it('works with any type', () => {
            const result = ok({ id: 1, name: 'test' });
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toEqual({ id: 1, name: 'test' });
            }
        });
    });

    describe('err', () => {
        it('creates error result', () => {
            const error = new Error('test error');
            const result = err(error);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe(error);
            }
        });
    });

    describe('isOk', () => {
        it('returns true for ok results', () => {
            const result = ok('test');
            expect(isOk(result)).toBe(true);
        });

        it('returns false for error results', () => {
            const result = err(new Error('test'));
            expect(isOk(result)).toBe(false);
        });
    });

    describe('isErr', () => {
        it('returns false for ok results', () => {
            const result = ok('test');
            expect(isErr(result)).toBe(false);
        });

        it('returns true for error results', () => {
            const result = err(new Error('test'));
            expect(isErr(result)).toBe(true);
        });
    });

    describe('unwrap', () => {
        it('returns value for ok results', () => {
            const result = ok('test');
            expect(unwrap(result)).toBe('test');
        });

        it('throws error for error results', () => {
            const error = new Error('test error');
            const result = err(error);
            expect(() => unwrap(result)).toThrow(error);
        });
    });

    describe('map', () => {
        it('transforms ok values', () => {
            const result = ok(5);
            const doubled = map(result, x => x * 2);
            expect(doubled.ok).toBe(true);
            if (doubled.ok) {
                expect(doubled.value).toBe(10);
            }
        });

        it('preserves errors', () => {
            const error = new Error('test error');
            const result = err(error);
            const mapped = map(result, x => x * 2);
            expect(mapped.ok).toBe(false);
            if (!mapped.ok) {
                expect(mapped.error).toBe(error);
            }
        });

        it('works with complex transformations', () => {
            const result = ok({ id: 1, name: 'John' });
            const nameResult = map(result, user => user.name);
            expect(nameResult.ok).toBe(true);
            if (nameResult.ok) {
                expect(nameResult.value).toBe('John');
            }
        });
    });

    describe('mapErr', () => {
        it('preserves ok values', () => {
            const result = ok('test');
            const mapped = mapErr(result, err => new Error('wont happen'));
            expect(mapped.ok).toBe(true);
            if (mapped.ok) {
                expect(mapped.value).toBe('test');
            }
        });

        it('transforms errors', () => {
            const error = new Error('original error');
            const result = err(error);
            const mapped = mapErr(result, err => new Error(`Enhanced: ${err.message}`));
            expect(mapped.ok).toBe(false);
            if (!mapped.ok) {
                expect(mapped.error.message).toBe('Enhanced: original error');
            }
        });
    });
});

describe('RustResult Async Functions', () => {
    describe('tryResult', () => {
        it('wraps third-party async operations that might throw', async () => {
            // Simulating a third-party API call that might throw
            const mockFetch = async () => {
                if (Math.random() > 0.5) {
                    throw new Error('Network error');
                }
                return { json: () => ({ id: 1, name: 'John' }) };
            };

            const result = await tryResult(async () => {
                const response = await mockFetch();
                return response.json();
            });
            
            // Result could be either ok or err depending on the mock
            expect(typeof result.ok).toBe('boolean');
        });

        it('returns error for failed async operations', async () => {
            const error = new Error('async error');
            const result = await tryResult(async () => {
                throw error;
            });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe(error);
            }
        });

        it('converts non-Error throws to Error', async () => {
            const result = await tryResult(async () => {
                throw 'string error';
            });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.message).toBe('string error');
            }
        });

        it('throws when shouldThrow is true', async () => {
            const error = new Error('async error');
            await expect(tryResult(async () => {
                throw error;
            }, true)).rejects.toThrow(error);
        });

        it('returns value directly when shouldThrow is true and successful', async () => {
            const result = await tryResult(async () => ok('success'), true);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe('success');
            }
        });
    });
});

describe('RustResult Assertion Functions', () => {
    describe('assert', () => {
        it('returns ok for true conditions', () => {
            const result = assert(true);
            expect(result.ok).toBe(true);
        });

        it('returns error for false conditions when shouldThrow is false', () => {
            const error = new Error('assertion failed');
            const result = assert(false, error, false);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe(error);
            }
        });

        it('throws for false conditions when shouldThrow is true', () => {
            const error = new Error('assertion failed');
            expect(() => assert(false, error, true)).toThrow(error);
        });

        it('uses default error when not provided', () => {
            const result = assert(false, undefined, false);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.message).toBe('Assertion failed');
            }
        });
    });

    describe('assertOr', () => {
        it('returns ok for true conditions', () => {
            const result = assertOr(true, new Error('test'));
            expect(result.ok).toBe(true);
        });

        it('returns typed error for false conditions when shouldThrow is false', () => {
            class CustomError extends Error {
                constructor(message: string) {
                    super(message);
                    this.name = 'CustomError';
                }
            }
            const error = new CustomError('custom error');
            const result = assertOr(false, error, false);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe(error);
                expect(result.error.name).toBe('CustomError');
            }
        });

        it('throws typed error for false conditions when shouldThrow is true', () => {
            class CustomError extends Error {
                constructor(message: string) {
                    super(message);
                    this.name = 'CustomError';
                }
            }
            const error = new CustomError('custom error');
            expect(() => assertOr(false, error, true)).toThrow(error);
        });
    });

    describe('assertNotNil', () => {
        it('returns value for non-null values', () => {
            const result = assertNotNil('test');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe('test');
            }
        });

        it('returns value for zero', () => {
            const result = assertNotNil(0);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe(0);
            }
        });

        it('returns value for empty string', () => {
            const result = assertNotNil('');
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe('');
            }
        });

        it('returns value for false', () => {
            const result = assertNotNil(false);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toBe(false);
            }
        });

        it('returns error for null when shouldThrow is false', () => {
            const result = assertNotNil(null, 'null error', false);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.message).toBe('null error');
            }
        });

        it('returns error for undefined when shouldThrow is false', () => {
            const result = assertNotNil(undefined, 'undefined error', false);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.message).toBe('undefined error');
            }
        });

        it('throws for null when shouldThrow is true', () => {
            expect(() => assertNotNil(null, 'null error', true)).toThrow('null error');
        });

        it('throws for undefined when shouldThrow is true', () => {
            expect(() => assertNotNil(undefined, 'undefined error', true)).toThrow('undefined error');
        });

        it('uses default message when not provided', () => {
            const result = assertNotNil(null, undefined, false);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.message).toBe('Expected value to be non-null');
            }
        });
    });
});

describe('RustResult Type Guards', () => {
    it('isOk narrows type correctly', () => {
        const result: Result<string> = ok('test');
        if (isOk(result)) {
            // TypeScript should know this is Ok<string>
            expect(result.value).toBe('test');
            // @ts-expect-error - should not have error property
            expect(result.error).toBeUndefined();
        }
    });

    it('isErr narrows type correctly', () => {
        const result: Result<string> = err(new Error('test'));
        if (isErr(result)) {
            // TypeScript should know this is Err
            expect(result.error.message).toBe('test');
            // @ts-expect-error - should not have value property
            expect(result.value).toBeUndefined();
        }
    });
});

describe('RustResult Integration Tests', () => {
    // Helper function that follows our pattern: returns Result<T> directly
    function divide(a: number, b: number): Result<number> {
        try {
            if (b === 0) {
                return err(new Error('Division by zero'));
            }
            return ok(a / b);
        } catch (error) {
            return err(error);
        }
    }

    // Helper function that follows our pattern: returns Result<T> directly
    function validateEmail(email: string): Result<string> {
        try {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return err(new Error('Invalid email format'));
            }
            return ok(email);
        } catch (error) {
            return err(error);
        }
    }

    it('chains map operations with functions that return Results directly', () => {
        const result = divide(10, 2);
        const doubled = map(result, x => x * 2);
        const squared = map(doubled, x => x * x);
        expect(squared.ok).toBe(true);
        if (squared.ok) {
            expect(squared.value).toBe(100); // (10/2 * 2) ^ 2
        }
    });

    it('handles error propagation through map with proper error handling', () => {
        const result = divide(10, 0); // This will return an error
        const mapped = map(result, x => x * 2);
        const mappedAgain = map(mapped, x => x + 1);
        expect(mappedAgain.ok).toBe(false);
        if (!mappedAgain.ok) {
            expect(mappedAgain.error.message).toBe('Division by zero');
        }
    });

    it('combines assertNotNil with map using proper pattern', () => {
        const user = { name: 'John', age: 30 };
        const nameResult = assertNotNil(user.name, 'Name is required', false);
        const upperName = map(nameResult, name => name.toUpperCase());
        expect(upperName.ok).toBe(true);
        if (upperName.ok) {
            expect(upperName.value).toBe('JOHN');
        }
    });

    it('demonstrates correct usage pattern: functions return Results, tryResult wraps third-party calls', async () => {
        // Our function returns Result<T> directly
        const emailResult = validateEmail('test@example.com');
        
        // We use tryResult to wrap third-party operations that might throw
        const thirdPartyResult = await tryResult(async () => {
            // Simulating a third-party API call
            const response = await fetch('https://api.example.com/data');
            return response.json();
        });

        // Both results follow our pattern
        expect(emailResult.ok).toBe(true);
        expect(typeof thirdPartyResult.ok).toBe('boolean');
    });

    it('shows error handling with mapErr for context', () => {
        const result = divide(10, 0);
        const contextualError = mapErr(result, err => 
            new Error(`Calculation failed: ${err.message}`)
        );
        expect(contextualError.ok).toBe(false);
        if (!contextualError.ok) {
            expect(contextualError.error.message).toBe('Calculation failed: Division by zero');
        }
    });
}); 