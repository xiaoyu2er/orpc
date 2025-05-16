import { skipToken } from '@tanstack/react-query'
import * as Key from './key'
import { createProcedureUtils } from './procedure-utils'

const buildKeySpy = vi.spyOn(Key, 'buildKey')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createProcedureUtils', () => {
  const controller = new AbortController()
  const signal = controller.signal
  const client = vi.fn().mockResolvedValue('__output__')
  const utils = createProcedureUtils(client, { path: ['ping'] })

  it('.call', () => {
    expect(utils.call).toBe(client)
  })

  describe('.queryOptions', () => {
    it('without skipToken', async () => {
      const options = utils.queryOptions({ input: { search: '__search__' }, context: { batch: '__batch__' } })

      expect(options.enabled).toBe(true)

      expect(options.queryKey).toBe(buildKeySpy.mock.results[0]!.value)
      expect(buildKeySpy).toHaveBeenCalledTimes(1)
      expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { type: 'query', input: { search: '__search__' } })

      await expect(options.queryFn!({ signal } as any)).resolves.toEqual('__output__')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__' }, { signal, context: { batch: '__batch__' } })
    })

    it('with skipToken', async () => {
      const options = utils.queryOptions({ input: skipToken, context: { batch: '__batch__' } })

      expect(options.enabled).toBe(false)

      expect(options.queryKey).toBe(buildKeySpy.mock.results[0]!.value)
      expect(buildKeySpy).toHaveBeenCalledTimes(1)
      expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { type: 'query', input: skipToken })

      expect(() => options.queryFn!({ signal } as any)).toThrow('queryFn should not be called with skipToken used as input')
      expect(client).toHaveBeenCalledTimes(0)
    })
  })

  describe('.infiniteOptions', () => {
    it('without skipToken', async () => {
      const getNextPageParam = vi.fn()

      const options = utils.infiniteOptions({
        input: pageParam => ({ search: '__search__', pageParam }),
        context: { batch: '__batch__' },
        getNextPageParam,
        initialPageParam: '__initialPageParam__',
      })

      expect(options.enabled).toBe(true)

      expect(options.queryKey).toBe(buildKeySpy.mock.results[0]!.value)
      expect(buildKeySpy).toHaveBeenCalledTimes(1)
      expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { type: 'infinite', input: { search: '__search__', pageParam: '__initialPageParam__' } })

      expect(options.initialPageParam).toEqual('__initialPageParam__')
      expect(options.getNextPageParam).toBe(getNextPageParam)

      await expect(options.queryFn!({ signal, pageParam: '__pageParam__' } as any)).resolves.toEqual('__output__')
      expect(client).toHaveBeenCalledTimes(1)
      expect(client).toBeCalledWith({ search: '__search__', pageParam: '__pageParam__' }, { signal, context: { batch: '__batch__' } })
    })

    it('with skipToken', async () => {
      const getNextPageParam = vi.fn()

      const options = utils.infiniteOptions({
        input: skipToken,
        context: { batch: '__batch__' },
        getNextPageParam,
        initialPageParam: '__initialPageParam__',
      })

      expect(options.enabled).toBe(false)

      expect(options.queryKey).toBe(buildKeySpy.mock.results[0]!.value)
      expect(buildKeySpy).toHaveBeenCalledTimes(1)
      expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { type: 'infinite', input: skipToken })

      expect(options.initialPageParam).toEqual('__initialPageParam__')
      expect(options.getNextPageParam).toBe(getNextPageParam)

      expect(() => options.queryFn!({ signal, pageParam: '__pageParam__' } as any)).toThrow('queryFn should not be called with skipToken used as input')
      expect(client).toHaveBeenCalledTimes(0)
    })
  })

  it('.mutationOptions', async () => {
    const options = utils.mutationOptions({
      context: { batch: '__batch__' },
    })

    expect(options.mutationKey).toBe(buildKeySpy.mock.results[0]!.value)
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { type: 'mutation' })

    await expect(options.mutationFn!('__input__')).resolves.toEqual('__output__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith('__input__', { context: { batch: '__batch__' } })
  })
})
