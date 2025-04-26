import type { CreateAsyncIteratorObjectOptions } from './iterator'
import { createAsyncIteratorObject, isAsyncIteratorObject } from './iterator'

it('isAsyncIteratorObject', () => {
  expect(isAsyncIteratorObject(null)).toBe(false)
  expect(isAsyncIteratorObject({})).toBe(false)
  expect(isAsyncIteratorObject(() => {})).toBe(false)
  expect(isAsyncIteratorObject({ [Symbol.asyncIterator]: 123 })).toBe(false)

  expect(isAsyncIteratorObject({ [Symbol.asyncIterator]: () => { } })).toBe(true)

  async function* gen() { }
  expect(isAsyncIteratorObject(gen())).toBe(true)

  function* gen2() { }
  expect(isAsyncIteratorObject(gen2())).toBe(false)
})

describe('createAsyncIteratorObject', () => {
  it('should create an object conforming to AsyncIterator protocol', () => {
    const mockNext = vi.fn()
    const iterator = createAsyncIteratorObject(mockNext)

    expect(iterator).toBeDefined()
    expect(typeof iterator.next).toBe('function')
    expect(typeof iterator.return).toBe('function')
    expect(typeof iterator.throw).toBe('function')
    expect(typeof iterator[Symbol.asyncIterator]).toBe('function')
    expect(typeof (iterator as any)[Symbol.asyncDispose]).toBe('function')
  })

  it('should return itself when [Symbol.asyncIterator] is called', () => {
    const mockNext = vi.fn()
    const iterator = createAsyncIteratorObject(mockNext)
    expect(iterator[Symbol.asyncIterator]()).toBe(iterator)
  })

  describe('next()', () => {
    it('should call the provided next function and return its result', async () => {
      const expectedResult = { done: false, value: 42 }
      const mockNext = vi.fn().mockResolvedValue(expectedResult)
      const iterator = createAsyncIteratorObject(mockNext)

      const result = await iterator.next()

      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(result).toEqual(expectedResult)
    })

    it('should handle multiple calls correctly', async () => {
      const results = [
        { done: false, value: 1 },
        { done: false, value: 2 },
        { done: true, value: undefined },
      ]
      const mockNext = vi.fn()
        .mockResolvedValueOnce(results[0])
        .mockResolvedValueOnce(results[1])
        .mockResolvedValueOnce(results[2])

      const iterator = createAsyncIteratorObject(mockNext)

      expect(await iterator.next()).toEqual(results[0])
      expect(await iterator.next()).toEqual(results[1])
      expect(await iterator.next()).toEqual(results[2])
      expect(mockNext).toHaveBeenCalledTimes(3)
    })

    it('should propagate errors from the provided next function', async () => {
      const error = new Error('Something went wrong')
      const mockNext = vi.fn().mockRejectedValue(error)
      const iterator = createAsyncIteratorObject(mockNext)

      await expect(iterator.next()).rejects.toThrow(error)
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should call onComplete("next") when next() resolves (done: true)', async () => {
      const mockOnComplete = vi.fn()
      const mockNext = vi.fn().mockResolvedValue({ done: true, value: undefined })
      const options: CreateAsyncIteratorObjectOptions = { onComplete: mockOnComplete }
      const iterator = createAsyncIteratorObject(mockNext, options)

      await iterator.next()

      expect(mockOnComplete).toHaveBeenCalledTimes(1)
      expect(mockOnComplete).toHaveBeenCalledWith('next')
    })

    it('should call onComplete("next") when next() rejects', async () => {
      const mockOnComplete = vi.fn()
      const error = new Error('Failed')
      const mockNext = vi.fn().mockRejectedValue(error)
      const options: CreateAsyncIteratorObjectOptions = { onComplete: mockOnComplete }
      const iterator = createAsyncIteratorObject(mockNext, options)

      await expect(iterator.next()).rejects.toThrow(error)

      expect(mockOnComplete).toHaveBeenCalledTimes(1)
      expect(mockOnComplete).toHaveBeenCalledWith('next')
    })
  })

  describe('return()', () => {
    it('should return { done: true, value } with the provided value', async () => {
      const mockNext = vi.fn()
      const iterator = createAsyncIteratorObject(mockNext)
      const returnValue = 'Iterator terminated'

      const result = await iterator.return(returnValue)

      expect(result).toEqual({ done: true, value: returnValue })
    })

    it('should call onComplete("return")', async () => {
      const mockOnComplete = vi.fn()
      const mockNext = vi.fn()
      const options: CreateAsyncIteratorObjectOptions = { onComplete: mockOnComplete }
      const iterator = createAsyncIteratorObject(mockNext, options)

      await iterator.return('done')

      expect(mockOnComplete).toHaveBeenCalledTimes(1)
      expect(mockOnComplete).toHaveBeenCalledWith('return')
      // Ensure the original next function wasn't called during return
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('throw()', () => {
    it('should re-throw the provided error', async () => {
      const mockNext = vi.fn()
      const iterator = createAsyncIteratorObject(mockNext)
      const error = new Error('Forced error')

      await expect(iterator.throw(error)).rejects.toThrow(error)
    })

    it('should call onComplete("throw")', async () => {
      const mockOnComplete = vi.fn()
      const mockNext = vi.fn()
      const options: CreateAsyncIteratorObjectOptions = { onComplete: mockOnComplete }
      const iterator = createAsyncIteratorObject(mockNext, options)
      const error = new Error('Forced error')

      await expect(iterator.throw(error)).rejects.toThrow(error)

      expect(mockOnComplete).toHaveBeenCalledTimes(1)
      expect(mockOnComplete).toHaveBeenCalledWith('throw')
      // Ensure the original next function wasn't called during throw
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('dispose()', () => {
    it('should fallback to random symbol if Symbol.asyncDispose is not available', () => {
      const OriginalSymbol = globalThis.Symbol
      const fallbackSymbol = Symbol.for('asyncDispose')

      globalThis.Symbol = {
        for: (name: string) => {
          expect(name).toBe('asyncDispose')
          return fallbackSymbol
        },
      } as any

      const iterator = createAsyncIteratorObject(() => {
        throw new Error('Should not be called')
      })

      expect(typeof (iterator as any)[fallbackSymbol]).toBe('function')

      globalThis.Symbol = OriginalSymbol
    })

    it('should have an async dispose method', () => {
      const mockNext = vi.fn()
      const iterator = createAsyncIteratorObject(mockNext)
      expect(typeof (iterator as any)[Symbol.asyncDispose]).toBe('function')
    })

    it('should call onComplete("dispose") when disposed', async () => {
      const mockOnComplete = vi.fn()
      const mockNext = vi.fn()
      const options: CreateAsyncIteratorObjectOptions = { onComplete: mockOnComplete }
      const iterator = createAsyncIteratorObject(mockNext, options)

      // Check if the method exists before calling
      await (iterator as any)[Symbol.asyncDispose]()

      expect(mockOnComplete).toHaveBeenCalledTimes(1)
      expect(mockOnComplete).toHaveBeenCalledWith('dispose')
      // Ensure the original next function wasn't called during dispose
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('integration with for await...of', () => {
    it('should work correctly in a for await...of loop', async () => {
      let counter = 0
      const limit = 3
      const mockNext = vi.fn(async () => {
        if (counter < limit) {
          return { done: false, value: counter++ }
        }
        else {
          return { done: true, value: undefined }
        }
      })
      const mockOnComplete = vi.fn()
      const options: CreateAsyncIteratorObjectOptions = { onComplete: mockOnComplete }
      const iterator = createAsyncIteratorObject(mockNext, options)

      const collectedValues: any[] = []
      for await (const value of iterator) {
        collectedValues.push(value)
      }

      expect(collectedValues).toEqual([0, 1, 2])
      expect(mockNext).toHaveBeenCalledTimes(limit + 1)
      expect(mockOnComplete).toHaveBeenCalledTimes(1)
      expect(mockOnComplete).toHaveBeenCalledWith('next')
    })

    it('should call onComplete("return") when breaking a for await...of loop', async () => {
      let counter = 0
      const mockNext = vi.fn(async () => ({ done: false, value: counter++ }))
      const mockOnComplete = vi.fn()
      const options: CreateAsyncIteratorObjectOptions = { onComplete: mockOnComplete }
      const iterator = createAsyncIteratorObject(mockNext, options)

      const collectedValues: number[] = []
      for await (const value of iterator) {
        collectedValues.push(value)
        if (value === 1) {
          break // Explicitly break the loop
        }
      }

      expect(collectedValues).toEqual([0, 1])
      expect(mockNext).toHaveBeenCalledTimes(2)
      expect(mockOnComplete).toHaveBeenCalledTimes(1)
      expect(mockOnComplete).toHaveBeenCalledWith('return')
    })

    it('should call onComplete("throw") when throwing inside a for await...of loop', async () => {
      let counter = 0
      const mockNext = vi.fn(async () => ({ done: false, value: counter++ }))
      const mockOnComplete = vi.fn()
      const options: CreateAsyncIteratorObjectOptions = { onComplete: mockOnComplete }
      const iterator = createAsyncIteratorObject(mockNext, options)
      const error = new Error('Loop error')

      const collectedValues: number[] = []
      try {
        for await (const value of iterator) {
          collectedValues.push(value)
          if (value === 1) {
            throw error // Throw inside the loop
          }
        }
      }
      catch (e) {
        expect(e).toBe(error) // Ensure the correct error was caught
      }

      expect(collectedValues).toEqual([0, 1])
      expect(mockNext).toHaveBeenCalledTimes(2)
      expect(mockOnComplete).toHaveBeenCalledTimes(1)
      expect(mockOnComplete).toHaveBeenCalledWith('return')
    })
  })
})
