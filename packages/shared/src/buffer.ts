/**
 * Converts Request/Response/Blob/File/.. to a buffer (ArrayBuffer or Uint8Array).
 *
 * Prefers the newer `.bytes` method when available as it more efficient but not widely supported yet.
 */
export function readAsBuffer(source: Pick<Blob, 'arrayBuffer' | 'bytes'>): Promise<ArrayBuffer | Uint8Array> {
  if (typeof source.bytes === 'function') {
    // eslint-disable-next-line ban/ban
    return source.bytes()
  }

  return (source as Pick<Blob, 'arrayBuffer'>).arrayBuffer()
}

/**
 * Converts a Uint8Array to a ArrayBuffer-backed Uint8Array.
 *
 * Starting with TypeScript 5.9, the DOM lib requires Uint8Array<ArrayBuffer>
 * for BlobPart compatibility. This function ensures the Uint8Array is backed
 * by an ArrayBuffer rather than other buffer types (like SharedArrayBuffer).
 */
export function ensureArrayBufferBackedUint8Array(source: Uint8Array): Uint8Array<ArrayBuffer> {
  if (source.buffer instanceof ArrayBuffer) {
    return source as Uint8Array<ArrayBuffer>
  }

  // Creating a new Uint8Array copies the underlying buffer, so only do this when necessary.
  return new Uint8Array(source)
}
