import { getEventMeta, withEventMeta } from '@orpc/server-standard'
import { z } from 'zod'
import { ValidationError } from './error'
import { ORPCError } from './error-orpc'
import { eventIterator, getEventIteratorSchemaDetails, mapEventSourceIterator } from './event-source'

describe('mapEventSourceIterator', () => {
  it('on success', async () => {
    let finished = false

    const iterator = (async function* () {
      try {
        yield 1
        yield { order: 2 }
        yield withEventMeta({ order: 3 }, { id: 'id-3' })
        return withEventMeta({ order: 4 }, { retry: 4000 })
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async v => ({ mapped: v }))

    const mapped = mapEventSourceIterator(iterator, {
      error: map,
      value: map,
    })

    await expect(mapped.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ mapped: 1 })
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    expect(map).toHaveBeenCalledTimes(1)
    expect(map).toHaveBeenLastCalledWith(1, false)

    await expect(mapped.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ mapped: { order: 2 } })
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    expect(map).toHaveBeenCalledTimes(2)
    expect(map).toHaveBeenLastCalledWith({ order: 2 }, false)

    await expect(mapped.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ mapped: { order: 3 } })
      expect(getEventMeta(value)).toEqual({ id: 'id-3' })

      return true
    })

    expect(map).toHaveBeenCalledTimes(3)
    expect(map).toHaveBeenLastCalledWith({ order: 3 }, false)

    await expect(mapped.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(true)
      expect(value).toEqual({ mapped: { order: 4 } })
      expect(getEventMeta(value)).toEqual({ retry: 4000 })

      return true
    })

    expect(map).toHaveBeenCalledTimes(4)
    expect(map).toHaveBeenLastCalledWith({ order: 4 }, true)

    expect(finished).toBe(true)
  })

  it('on error', async () => {
    let finished = false
    const error = withEventMeta(new Error('TEST'), { id: 'error-1' })

    const iterator = (async function* () {
      try {
        throw error
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async v => ({ mapped: v }))

    const mapped = mapEventSourceIterator(iterator, {
      error: map,
      value: map,
    })

    await expect(mapped.next()).rejects.toSatisfy((e) => {
      expect(e).toEqual({ mapped: error })
      expect(getEventMeta(e)).toEqual({ id: 'error-1' })

      return true
    })

    expect(map).toHaveBeenCalledTimes(1)
    expect(map).toHaveBeenLastCalledWith(error)

    expect(finished).toBe(true)
  })

  it('cancel original when .return is called', async () => {
    let finished = false

    const iterator = (async function* () {
      try {
        yield 1
        yield 2
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async v => ({ mapped: v }))

    const mapped = mapEventSourceIterator(iterator, {
      error: map,
      value: map,
    })

    await mapped.next()
    await mapped.return({} as any)

    expect(map).toHaveBeenCalledTimes(1)
    expect(finished).toBe(true)
  })

  it('cancel original when .throw is called', async () => {
    let finished = false

    const iterator = (async function* () {
      try {
        yield 1
        yield 2
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async v => ({ mapped: v }))

    const mapped = mapEventSourceIterator(iterator, {
      error: map,
      value: map,
    })

    await mapped.next()
    const error = new Error('TEST')
    await expect(mapped.throw(new Error('TEST'))).rejects.toEqual({ mapped: error })

    expect(map).toHaveBeenCalledTimes(2)

    expect(finished).toBe(true)
  })
})

describe('eventIterator', async () => {
  it('expect a async iterator object', async () => {
    const schema = eventIterator(z.object({ order: z.number() }))
    const result = await schema['~standard'].validate(123)
    expect(result.issues).toHaveLength(1)
  })

  it('can validate yields', async () => {
    const schema = eventIterator(z.object({ order: z.number() }))

    const result = await schema['~standard'].validate((async function*() {
      yield { order: 1 }
      yield withEventMeta({ order: 2 }, { id: 'id-2' })
      yield { order: '3' }
    })())

    if (result.issues) {
      throw new Error('Validation failed')
    }

    await expect(result.value.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 1 })
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    await expect(result.value.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 2 })
      expect(getEventMeta(value)).toEqual({ id: 'id-2' })

      return true
    })

    await expect(result.value.next()).rejects.toSatisfy((e) => {
      expect(e).toBeInstanceOf(ORPCError)
      expect(e.code).toEqual('EVENT_ITERATOR_VALIDATION_FAILED')
      expect(e.cause).toBeInstanceOf(ValidationError)
      expect(e.cause.issues).toHaveLength(1)

      return true
    })
  })

  it('can validate returns', async () => {
    const schema = eventIterator(z.object({ order: z.number() }), z.object({ order: z.number() }))

    const result = await schema['~standard'].validate((async function*() {
      return { order: 1 }
    })())

    if (result.issues) {
      throw new Error('Validation failed')
    }

    await expect(result.value.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(true)
      expect(value).toEqual({ order: 1 })
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })
  })

  it('not required returns schema', async () => {
    const schema = eventIterator(z.object({ order: z.number() }))

    const result = await schema['~standard'].validate((async function*() {
      return 'anything'
    })())

    if (result.issues) {
      throw new Error('Validation failed')
    }

    await expect(result.value.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(true)
      expect(value).toEqual('anything')

      return true
    })
  })
})

it('getEventIteratorSchemaDetails', async () => {
  const yieldSchema = z.object({ order: z.number() })
  const returnSchema = z.object({ order: z.number() })
  const schema = eventIterator(yieldSchema, returnSchema)

  expect(getEventIteratorSchemaDetails(schema)).toEqual({ yields: yieldSchema, returns: returnSchema })
  expect(getEventIteratorSchemaDetails(undefined)).toBeUndefined()
  expect(getEventIteratorSchemaDetails(z.object({}))).toBeUndefined()
})
