import { resolvePromisableValue } from './value'

describe('resolvePromisableValue', () => {
  // Test resolving primitive values
  describe('primitive Values', () => {
    it('should resolve a primitive number', async () => {
      const result = await resolvePromisableValue(42)
      expect(result).toBe(42)
    })

    it('should resolve a primitive string', async () => {
      const result = await resolvePromisableValue('hello')
      expect(result).toBe('hello')
    })

    it('should resolve a primitive boolean', async () => {
      const result = await resolvePromisableValue(true)
      expect(result).toBe(true)
    })

    it('should resolve null', async () => {
      const result = await resolvePromisableValue(null)
      expect(result).toBe(null)
    })

    it('should resolve undefined', async () => {
      const result = await resolvePromisableValue(undefined)
      expect(result).toBe(undefined)
    })
  })

  // Test resolving promise-like values
  describe('promise-like Values', () => {
    it('should resolve a promise with a number', async () => {
      const result = await resolvePromisableValue(Promise.resolve(42))
      expect(result).toBe(42)
    })

    it('should resolve a promise with a string', async () => {
      const result = await resolvePromisableValue(Promise.resolve('hello'))
      expect(result).toBe('hello')
    })

    it('should resolve a promise with an object', async () => {
      const testObj = { key: 'value' }
      const result = await resolvePromisableValue(Promise.resolve(testObj))
      expect(result).toEqual(testObj)
    })
  })

  // Test resolving function-based values
  describe('function-based Values', () => {
    it('should resolve a synchronous function returning a number', async () => {
      const result = await resolvePromisableValue(() => 42)
      expect(result).toBe(42)
    })

    it('should resolve a synchronous function returning a string', async () => {
      const result = await resolvePromisableValue(() => 'hello')
      expect(result).toBe('hello')
    })

    it('should resolve an async function', async () => {
      const result = await resolvePromisableValue(async () => 42)
      expect(result).toBe(42)
    })

    it('should resolve an async function returning a promise', async () => {
      const result = await resolvePromisableValue(async () => Promise.resolve('hello'))
      expect(result).toBe('hello')
    })
  })

  // Test error handling
  describe('error Scenarios', () => {
    it('should handle a function throwing an error', async () => {
      const errorFunc = () => {
        throw new Error('Test error')
      }

      await expect(resolvePromisableValue(errorFunc)).rejects.toThrow('Test error')
    })

    it('should handle an async function rejecting', async () => {
      const rejectFunc = async () => {
        throw new Error('Async error')
      }

      await expect(resolvePromisableValue(rejectFunc)).rejects.toThrow('Async error')
    })
  })

  // Type inference tests (compile-time checks)
  describe('type Inference', () => {
    it('should maintain type inference for different value types', async () => {
      // These are compile-time checks, they will fail to compile if type inference is incorrect
      const num = await resolvePromisableValue(42)
      expectTypeOf(num).toEqualTypeOf<number>()

      const str = await resolvePromisableValue(Promise.resolve('hello'))
      expectTypeOf(str).toEqualTypeOf<string>()

      const obj = await resolvePromisableValue(() => ({ key: 'value' }))
      expectTypeOf(obj).toEqualTypeOf<{ key: string }>()
    })
  })

  describe('promise-like Objects (Non-Native Promises)', () => {
    it('should resolve a simple thenable object', async () => {
      const thenableObject = {
        then(resolve: (value: number) => void) {
          resolve(42)
        },
      }

      const result = await resolvePromisableValue(thenableObject)
      expect(result).toBe(42)
    })

    it('should resolve a complex thenable object', async () => {
      const complexThenable = {
        then(
          resolve: (value: { data: string }) => void,
          reject: (error: Error) => void,
        ) {
          resolve({ data: 'hello world' })
        },
      }

      const result = await resolvePromisableValue(complexThenable)
      expect(result).toEqual({ data: 'hello world' })
    })

    it('should handle a thenable object with delayed resolution', async () => {
      const delayedThenable = {
        then(resolve: (value: string) => void) {
          setTimeout(() => resolve('delayed value'), 10)
        },
      }

      const result = await resolvePromisableValue(delayedThenable)
      expect(result).toBe('delayed value')
    })

    it('should propagate errors from thenable objects', async () => {
      const errorThenable = {
        then(
          resolve: (value: any) => void,
          reject: (error: Error) => void,
        ) {
          reject(new Error('Thenable error'))
        },
      }

      await expect(resolvePromisableValue(errorThenable)).rejects.toThrow('Thenable error')
    })

    it('should work with a nested promise-like object', async () => {
      const nestedThenable = {
        then(resolve: (value: { nested: { value: number } }) => void) {
          resolve({ nested: { value: 123 } })
        },
      }

      const result = await resolvePromisableValue(nestedThenable)
      expect(result).toEqual({ nested: { value: 123 } })
    })
  })
})
