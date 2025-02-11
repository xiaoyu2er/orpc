import type { JsonValue } from 'type-fest'

export function parseEmptyableJSON(text: string): JsonValue | undefined {
  if (text === '') {
    return undefined
  }

  return JSON.parse(text)
}
