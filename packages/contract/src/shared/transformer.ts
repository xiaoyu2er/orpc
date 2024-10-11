export interface Transformer {
  stringify(input: unknown): string | undefined
  parse(input: string): unknown
}
