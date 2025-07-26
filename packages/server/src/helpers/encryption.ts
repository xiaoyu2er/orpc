import { decodeBase64url, encodeBase64url } from './base64url'

/**
 * Encrypts a string using AES-GCM with a secret key.
 * The output is base64url encoded to be URL-safe.
 *
 * @example
 * ```ts
 * const encrypted = await encrypt("Hello, World!", "test-secret-key")
 * const decrypted = await decrypt(encrypted, "test-secret-key")
 * expect(decrypted).toBe("Hello, World!")
 * ```
 */
export async function encrypt(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  )

  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(new Uint8Array(encrypted), salt.length + iv.length)

  return encodeBase64url(result)
}

/**
 * Decrypts a base64url encoded string using AES-GCM with a secret key.
 * Returns the original string if decryption is successful, or undefined if it fails.
 *
 * @example
 * ```ts
 * const encrypted = await encrypt("Hello, World!", "test-secret-key")
 * const decrypted = await decrypt(encrypted, "test-secret-key")
 * expect(decrypted).toBe("Hello, World!")
 * ```
 */
export async function decrypt(encrypted: string | undefined | null, secret: string): Promise<string | undefined> {
  try {
    const data = decodeBase64url(encrypted)

    if (data === undefined) {
      return undefined
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const salt = data.slice(0, 16)
    const iv = data.slice(16, 28)
    const encryptedData = data.slice(28)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      'PBKDF2',
      false,
      ['deriveKey'],
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData,
    )

    return decoder.decode(decrypted)
  }
  catch {
    // Return undefined if decryption fails (invalid key, corrupted data, etc.)
    return undefined
  }
}
