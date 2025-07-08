/**
 * Converts a Blob to a buffer (ArrayBuffer or Uint8Array).
 *
 * Prefers the newer `.bytes` method when available as it more efficient but not widely supported yet.
 */
export function blobToBuffer(blob: Blob): Promise<ArrayBuffer | Uint8Array> {
  if ('bytes' in blob) {
    // eslint-disable-next-line ban/ban
    return blob.bytes()
  }

  return (blob as Blob).arrayBuffer()
}
