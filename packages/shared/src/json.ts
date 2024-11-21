export function parseJSONSafely(text: string): unknown {
  if (text === '')
    return undefined

  try {
    return JSON.parse(text)
  }
  catch {
    return text
  }
}
