import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import * as Body from './body'
import { toLazyStandardRequest } from './request'
import * as Signal from './signal'

const toStandardBodySpy = vi.spyOn(Body, 'toStandardBody')
const toAbortSignalSpy = vi.spyOn(Signal, 'toAbortSignal')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toLazyStandardRequest', () => {
  it('works', async () => {
    let standardRequest: any

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      standardRequest = toLazyStandardRequest(req, res)
      expect(toStandardBodySpy).not.toBeCalled()
      await standardRequest.body() // ensure body is load before sending response
      expect(standardRequest.headers).toBe(req.headers)
      expect(toStandardBodySpy).toBeCalledTimes(1)
      expect(toStandardBodySpy).toBeCalledWith(req)
      expect(toAbortSignalSpy).toBeCalledTimes(1)
      expect(toAbortSignalSpy).toBeCalledWith(res)
      res.end()
    }).post('/hello').send({ foo: 'bar' })

    expect(standardRequest.url).toBeInstanceOf(URL)
    expect(standardRequest.url.toString()).toMatch(/http:\/\/.*\/hello/)
    expect(standardRequest.method).toBe('POST')
    expect(standardRequest.signal.aborted).toBe(true)
    expect(standardRequest.body()).toBe(toStandardBodySpy.mock.results[0]!.value)
  })

  it('lazy body', async () => {
    await request(async (req: IncomingMessage, res: ServerResponse) => {
      const standardRequest = toLazyStandardRequest(req, res)
      expect(toStandardBodySpy).toBeCalledTimes(0)
      const overrideBody = () => Promise.resolve('1')
      standardRequest.body = overrideBody
      expect(standardRequest.body).toBe(overrideBody)
      expect(toStandardBodySpy).toBeCalledTimes(0)
      res.end()
    }).post('/hello').send({ foo: 'bar' })

    await request(async (req: IncomingMessage, res: ServerResponse) => {
      const standardRequest = toLazyStandardRequest(req, res)
      expect(standardRequest.body()).toEqual(toStandardBodySpy.mock.results[0]!.value)
      expect(standardRequest.body()).toEqual(toStandardBodySpy.mock.results[0]!.value) // ensure cached
      expect(toStandardBodySpy).toBeCalledTimes(1)
      res.end()
    }).post('/hello').send({ foo: 'bar' })
  })
})
