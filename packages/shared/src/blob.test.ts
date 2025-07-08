import { blobToBuffer } from './blob'

it('blobToBuffer', async () => {
  const blob = new Blob(['test'], { type: 'text/plain' })

  expect(new TextDecoder().decode(await blobToBuffer(blob))).toBe('test')
  expect(new TextDecoder().decode(await blobToBuffer(new Proxy(blob, {
    has: (target, prop) => Reflect.has(target, prop) && prop !== 'bytes',
  })))).toBe('test')
})
