import { toStandardUrl } from './url'

describe('toStandardUrl', () => {
  it('origin', async () => {
    expect(toStandardUrl({
      requestContext: {
        domainName: 'example1.com',
      },
      headers: {
        host: 'example2.com',
      },
      multiValueHeaders: {
        host: ['example3.com', 'example4.com'],
      },
      path: '/',
    } as any).origin).toEqual('https://example1.com')

    expect(toStandardUrl({
      requestContext: {},
      headers: {
        host: 'example2.com',
      },
      multiValueHeaders: {
        host: ['example3.com', 'example4.com'],
      },
      path: '/',
    } as any).origin).toEqual('https://example2.com')

    expect(toStandardUrl({
      requestContext: {},
      headers: {},
      multiValueHeaders: {
        host: ['example3.com', 'example4.com'],
      },
      path: '/',
    } as any).origin).toEqual('https://example3.com')

    expect(toStandardUrl({
      requestContext: {},
      headers: {},
      multiValueHeaders: {},
      path: '/',
    } as any).origin).toEqual('https://localhost')
  })

  it('query string', async () => {
    expect(toStandardUrl({
      requestContext: {},
      headers: {},
      multiValueHeaders: {},
      path: '/',
      queryStringParameters: {
        key1: 'value1',
        key2: 'value2',
      },
      multiValueQueryStringParameters: {
        key2: ['value3', 'value4'],
        key3: ['value5', 'value6'],
      },
    } as any).search).toEqual('?key1=value1&key2=value2&key2=value3&key2=value4&key3=value5&key3=value6')
  })
})
