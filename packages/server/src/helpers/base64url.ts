/**
 * Encodes a Uint8Array to base64url format
 * Base64url is URL-safe and doesn't use padding
 *
 * @example
 * ```ts
 * const text = "Hello World"
 * const encoded = encodeBase64url(new TextEncoder().encode(text))
 * const decoded = decodeBase64url(encoded)
 * expect(new TextDecoder().decode(decoded)).toEqual(text)
 * ```
 */
export function encodeBase64url(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data))
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Decodes a base64url string to Uint8Array
 * Returns undefined if the input is invalid
 *
 * @example
 * ```ts
 * const text = "Hello World"
 * const encoded = encodeBase64url(new TextEncoder().encode(text))
 * const decoded = decodeBase64url(encoded)
 * expect(new TextDecoder().decode(decoded)).toEqual(text)
 * ```
 */
export function decodeBase64url(base64url: string | undefined | null): Uint8Array | undefined {
  try {
    if (typeof base64url !== 'string') {
      return undefined
    }

    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')

    while (base64.length % 4) {
      base64 += '='
    }

    return new Uint8Array(
      atob(base64).split('').map(char => char.charCodeAt(0)),
    )
  }
  catch {
    return undefined
  }
}
