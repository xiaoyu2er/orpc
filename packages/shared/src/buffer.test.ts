import { ensureArrayBufferBackedUint8Array, readAsBuffer } from './buffer'

it('readAsBuffer', async () => {
  const blob = new Blob(['test'], { type: 'text/plain' })

  expect(new TextDecoder().decode(await readAsBuffer(blob))).toBe('test')
  expect(new TextDecoder().decode(await readAsBuffer(new Proxy(blob, {
    get: (target, prop) => {
      if (prop === 'bytes') {
        return undefined
      }
      return Reflect.get(target, prop)
    },
  })))).toBe('test')

  expect(new TextDecoder().decode(await readAsBuffer((new Response(blob) as any)))).toBe('test')
})

describe('ensureArrayBufferBackedUint8Array', () => {
  it('should return the same instance when source is already ArrayBuffer-backed', () => {
    const arrayBuffer = new ArrayBuffer(4)
    const source = new Uint8Array(arrayBuffer)
    source[0] = 1
    source[1] = 2
    source[2] = 3
    source[3] = 4

    const result = ensureArrayBufferBackedUint8Array(source)

    expect(result).toBe(source)
    expect(result.buffer).toBe(arrayBuffer)
    expect(Array.from(result)).toEqual([1, 2, 3, 4])
  })

  it('should handle ArrayBuffer-backed Uint8Array with offset and length', () => {
    const arrayBuffer = new ArrayBuffer(8)
    const fullView = new Uint8Array(arrayBuffer)

    for (let i = 0; i < 8; i++) {
      fullView[i] = i + 100
    }

    const source = new Uint8Array(arrayBuffer, 1, 3)

    const result = ensureArrayBufferBackedUint8Array(source)

    expect(result).toBe(source)
    expect(result.buffer).toBe(arrayBuffer)
    expect(result.length).toBe(3)
    expect(Array.from(result)).toEqual([101, 102, 103])
    expect(result.byteOffset).toBe(1)
  })

  it('should create a new ArrayBuffer-backed Uint8Array when source uses SharedArrayBuffer', () => {
    const sharedBuffer = new SharedArrayBuffer(4)
    const source = new Uint8Array(sharedBuffer)
    source[0] = 5
    source[1] = 6
    source[2] = 7
    source[3] = 8

    const result = ensureArrayBufferBackedUint8Array(source)

    expect(result).not.toBe(source)
    expect(result.buffer).not.toBe(sharedBuffer)
    expect(result.buffer).toBeInstanceOf(ArrayBuffer)
    expect(Array.from(result)).toEqual([5, 6, 7, 8])
  })

  it('should handle SharedArrayBuffer-backed Uint8Array with offset and length', () => {
    const sharedBuffer = new SharedArrayBuffer(10)
    const fullView = new Uint8Array(sharedBuffer)

    for (let i = 0; i < 10; i++) {
      fullView[i] = i * 10
    }

    const source = new Uint8Array(sharedBuffer, 2, 4)

    const result = ensureArrayBufferBackedUint8Array(source)

    expect(result).not.toBe(source)
    expect(result.buffer).not.toBe(sharedBuffer)

    expect(result.buffer).toBeInstanceOf(ArrayBuffer)
    expect(result.length).toBe(4)
    expect(Array.from(result)).toEqual([20, 30, 40, 50])
    expect(result.byteOffset).toBe(0)
    expect(result.buffer.byteLength).toBe(4)
  })

  it('should handle empty Uint8Array', () => {
    const source = new Uint8Array(0)

    const result = ensureArrayBufferBackedUint8Array(source)

    expect(result).toBe(source)
    expect(result.length).toBe(0)
    expect(result.buffer).toBeInstanceOf(ArrayBuffer)
  })
})
