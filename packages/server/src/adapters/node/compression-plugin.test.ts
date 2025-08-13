import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import { os } from '../../builder'
import { CompressionPlugin } from './compression-plugin'
import { RPCHandler } from './rpc-handler'

describe('compressionPlugin', () => {
  const output = 'x'.repeat(1024) // Large enough to trigger compression

  it('should compress response when accept-encoding includes gzip', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => output), {
        plugins: [
          new CompressionPlugin(),
        ],
      })

      await handler.handle(req, res)
    })
      .post('/')
      .set('accept-encoding', 'gzip, deflate')
      .send({ input: 'test' })

    expect(res.status).toBe(200)
    expect(res.headers['content-encoding']).toBe('gzip')
    // Just check that we get a response, not trying to decompress for now
    expect(res.body).toBeDefined()
  })

  it('should not compress response when accept-encoding does not include compression', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => output), {
        plugins: [
          new CompressionPlugin(),
        ],
      })

      await handler.handle(req, res)
    })
      .post('/')
      .set('accept-encoding', 'identity')
      .send({ input: 'test' })

    expect(res.status).toBe(200)
    expect(res.headers['content-encoding']).toBeUndefined()
    expect(res.text).toContain(output)
  })

  it('should not compress responses if not satisfying filter', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => output), {
        plugins: [
          new CompressionPlugin({
            filter: () => false, // Disable compression entirely for this test
          }),
        ],
      })

      await handler.handle(req, res)
    })
      .post('/')
      .set('accept-encoding', 'gzip, deflate')
      .send({ input: 'test' })

    expect(res.status).toBe(200)
    expect(res.headers['content-encoding']).toBeUndefined()
    expect(res.text).toContain(output)
  })

  it('should work with deflate compression', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => output), {
        plugins: [
          new CompressionPlugin(),
        ],
      })

      await handler.handle(req, res)
    })
      .post('/')
      .set('accept-encoding', 'deflate')
      .send({ input: 'test' })

    expect(res.status).toBe(200)
    expect(res.headers['content-encoding']).toBe('deflate')
  })

  it('should throw if rootInterceptor throws', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => output), {
        plugins: [
          new CompressionPlugin(),
        ],
        rootInterceptors: [
          async () => {
            throw new Error('Test error')
          },
        ],
      })

      await expect(handler.handle(req, res)).rejects.toThrow('Test error')

      res.statusCode = 500
      res.end()
    })
      .post('/')
      .set('accept-encoding', 'gzip, deflate')
      .send({ input: 'test' })

    expect(res.status).toBe(500)
    expect(res.headers['content-encoding']).toBeUndefined()
  })

  it('should throw if compression options throw', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => output), {
        plugins: [
          new CompressionPlugin({
            filter: () => {
              throw new Error('Test error')
            },
          }),
        ],
      })

      await expect(handler.handle(req, res)).rejects.toThrow('Test error')

      res.statusCode = 500
      res.end()
    })
      .post('/')
      .set('accept-encoding', 'gzip, deflate')
      .send({ input: 'test' })

    expect(res.status).toBe(500)
    expect(res.headers['content-encoding']).toBeUndefined()
  })
})
