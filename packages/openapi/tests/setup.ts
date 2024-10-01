import OpenAPIParser from '@readme/openapi-parser'
import { expect, vi } from 'vitest'
import type { generateOpenAPI } from '../src/generator'

const generator = await vi.importActual('../src/generator')

vi.mock('../src/generator', () => ({
  generateOpenAPI: vi.fn((...args) => {
    // @ts-expect-error
    const spec = generator.generateOpenAPI(...args)
    expect(
      (async () => {
        await OpenAPIParser.validate(spec)
        return true
      })(),
    ).resolves.toBe(true)
    return spec
  }) as typeof generateOpenAPI,
}))
