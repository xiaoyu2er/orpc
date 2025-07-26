import { decodeBase64url, encodeBase64url } from './base64url'

describe('encodeBase64url / decodeBase64url', () => {
  it('should encode and decode Uint8Array correctly', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100])
    const encoded = encodeBase64url(original)
    const decoded = decodeBase64url(encoded)

    expect(decoded).toEqual(original)
  })

  it('should produce URL-safe output without padding', () => {
    const data = new Uint8Array([255, 254, 253]) // Will produce +/= characters in regular base64
    const encoded = encodeBase64url(data)

    expect(encoded).not.toMatch(/[+/=]/)
    expect(encoded).toMatch(/^[\w-]+$/)
  })

  it('should handle empty data', () => {
    const empty = new Uint8Array([])
    const encoded = encodeBase64url(empty)
    const decoded = decodeBase64url(encoded)

    expect(encoded).toBe('')
    expect(decoded).toEqual(empty)
  })

  it('should work with TextEncoder/TextDecoder', () => {
    const text = 'Hello World'
    const encoded = encodeBase64url(new TextEncoder().encode(text))
    const decoded = decodeBase64url(encoded)

    expect(new TextDecoder().decode(decoded)).toEqual(text)
  })
})
