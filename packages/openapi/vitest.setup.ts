import type { generateOpenAPI } from './src/generator'
import OpenAPIParser from '@readme/openapi-parser'
import { expect, vi } from 'vitest'

// eslint-disable-next-line antfu/no-top-level-await
const generator = await vi.importActual('./src/generator')

vi.mock('./src/generator', () => ({
  generateOpenAPI: vi.fn(async (...args) => {
    // @ts-expect-error - untyped
    const spec = await generator.generateOpenAPI(...args)
    expect(
      (async () => {
        await OpenAPIParser.validate(spec)
        return true
      })(),
    ).resolves.toBe(true)
    return spec
  }) as typeof generateOpenAPI,
}))
