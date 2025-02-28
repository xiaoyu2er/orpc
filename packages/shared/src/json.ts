export function parseEmptyableJSON(text: string): unknown {
  if (!text) {
    return undefined
  }

  return JSON.parse(text)
}
