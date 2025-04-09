import { ORPCError, os } from '@orpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StandardRPCHandler } from '../../../../server/src/adapters/standard/rpc-handler'
import { supportedDataTypes } from '../../../tests/shared'
import { StandardRPCLink } from './rpc-link'

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each(supportedDataTypes)('standardRPCLink: $name', ({ value, expected }) => {
  describe.each(['GET', 'POST'] as const)('method: %s', (method) => {
    async function assertSuccessCase(value: unknown, expected: unknown): Promise<true> {
      const handler = vi.fn(({ input }) => input)

      const rpcHandler = new StandardRPCHandler(os.handler(handler), {
        strictGetMethodPluginEnabled: false,
      })

      const rpcLink = new StandardRPCLink({
        async call(request, options, path, input) {
          const { response } = await rpcHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, {
            context: {},
            prefix: '/prefix',
          })

          if (!response) {
            throw new Error('No response')
          }

          return { ...response, body: () => Promise.resolve(response.body) }
        },
      }, {
        url: new URL('http://localhost/prefix'),
      })

      const output = await rpcLink.call([], value, { context: {} })

      expect(output).toEqual(expected)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ input: expected }))

      return true
    }

    async function assertErrorCase(value: unknown, expected: unknown): Promise<true> {
      const handler = vi.fn(({ input }) => {
        throw new ORPCError('TEST', {
          data: input,
        })
      })

      const rpcHandler = new StandardRPCHandler(os.handler(handler), {
        strictGetMethodPluginEnabled: false,
      })

      const rpcLink = new StandardRPCLink({
        async call(request, options, path, input) {
          const { response } = await rpcHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, {
            context: {},
            prefix: '/prefix',
          })

          if (!response) {
            throw new Error('No response')
          }

          return { ...response, body: () => Promise.resolve(response.body) }
        },
      }, {
        url: new URL('http://localhost/prefix'),
      })

      await expect(rpcLink.call([], value, { context: {} })).rejects.toSatisfy((e) => {
        expect(e).toBeInstanceOf(ORPCError)
        expect(e.code).toBe('TEST')
        expect(e.data).toEqual(expected)

        return true
      })

      return true
    }

    it('should work on flat', async () => {
      expect(await assertSuccessCase(value, expected)).toBe(true)
      expect(await assertErrorCase(value, expected)).toBe(true)
    })

    it('should work on nested object', async () => {
      expect(await assertSuccessCase({ data: value }, { data: expected })).toBe(true)
      expect(await assertErrorCase({ data: value }, { data: expected })).toBe(true)
    })

    it('should work on complex object', async () => {
      expect(await assertSuccessCase({
        '!@#$%^^&()[]>?<~_<:"~+!_': value,
        'list': [value],
        'map': new Map([[value, value]]),
        'set': new Set([value]),
        'nested': {
          nested: value,
        },
      }, {
        '!@#$%^^&()[]>?<~_<:"~+!_': expected,
        'list': [expected],
        'map': new Map([[expected, expected]]),
        'set': new Set([expected]),
        'nested': {
          nested: expected,
        },
      })).toBe(true)

      expect(await assertErrorCase({
        '!@#$%^^&()[]>?<~_<:"~+!_': value,
        'list': [value],
        'map': new Map([[value, value]]),
        'set': new Set([value]),
        'nested': {
          nested: value,
        },
      }, {
        '!@#$%^^&()[]>?<~_<:"~+!_': expected,
        'list': [expected],
        'map': new Map([[expected, expected]]),
        'set': new Set([expected]),
        'nested': {
          nested: expected,
        },
      })).toBe(true)
    })
  })
})
