import { SignJWT } from 'jose'
import { DURABLE_ITERATOR_TOKEN_PARAM } from '../consts'
import { parseDurableIteratorToken, signDurableIteratorToken } from '../schemas'
import { upgradeDurableIteratorRequest } from './upgrade'

describe('upgradeDurableIteratorRequest', () => {
  it('reject non-websocket upgrade', async () => {
    const response = await upgradeDurableIteratorRequest(
      new Request('https://example.com'),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(426)
  })

  it('rejects missing token', async () => {
    const response = await upgradeDurableIteratorRequest(
      new Request('https://example.com', {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('rejects invalid token', async () => {
    const response = await upgradeDurableIteratorRequest(
      new Request('https://example.com?token=invalid-token', {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('rejects invalid payload', async () => {
    const jwt = await new SignJWT({ invalid: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(new Date(Date.now() + 1000 * 1000))
      .sign(new TextEncoder().encode('test-sign'))
    const response = await upgradeDurableIteratorRequest(
      new Request(`https://example.com?token=${jwt}`, {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('upgrades valid request', async () => {
    const namespace = {
      idFromName: vi.fn((name: string) => new TextEncoder().encode(name)),
      get: vi.fn(() => ({
        fetch: vi.fn(() => new Response('WebSocket Upgrade Successful')),
      })),
    }

    const date = 1244444444444

    const token = await signDurableIteratorToken('signing-key', {
      chn: 'test-channel',
      rpc: ['someMethod'],
      att: { some: 'attachment' },
      id: 'test-id',
      iat: date,
      exp: date + 1000,
    })

    const url = new URL('https://example.com')
    url.searchParams.set(DURABLE_ITERATOR_TOKEN_PARAM, token)

    const response = await upgradeDurableIteratorRequest(
      new Request(url, {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: namespace as any,
        signingKey: 'signing-key',
      },
    )

    expect(await response.text()).toEqual('WebSocket Upgrade Successful')

    expect(namespace.idFromName).toHaveBeenCalledWith('test-channel')
    expect(namespace.get).toHaveBeenCalledWith(namespace.idFromName.mock.results[0]!.value)
    const stub = namespace.get.mock.results[0]!.value
    const requestUrl = new URL(stub.fetch.mock.calls[0][0].url)
    const requestHeaders = stub.fetch.mock.calls[0][0].headers

    expect(parseDurableIteratorToken(requestUrl.searchParams.get(DURABLE_ITERATOR_TOKEN_PARAM)!)).toEqual({
      chn: 'test-channel',
      rpc: ['someMethod'],
      att: { some: 'attachment' },
      id: 'test-id',
      iat: date,
      exp: date + 1000,
    })

    expect(requestHeaders.get('upgrade')).toBe('websocket')
  })
})
