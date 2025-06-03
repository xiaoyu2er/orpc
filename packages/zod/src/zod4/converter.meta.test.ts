import * as z from 'zod/v4'
import { testSchemaConverter } from '../../tests/shared'
import {
  experimental_JSON_SCHEMA_INPUT_REGISTRY as JSON_SCHEMA_INPUT_REGISTRY,
  experimental_JSON_SCHEMA_OUTPUT_REGISTRY as JSON_SCHEMA_OUTPUT_REGISTRY,
  experimental_JSON_SCHEMA_REGISTRY as JSON_SCHEMA_REGISTRY,
} from './registries'

const customSchema1 = z.string().meta({
  description: 'description',
  examples: ['a', 'b'],
})

const customSchema1_unsupported_examples = z.string().meta({
  description: 'description',
  examples: {
    a: {
      value: 'a',
    },
  },
})

const customSchema2 = z.object({
  value: z.string(),
})

JSON_SCHEMA_REGISTRY.add(customSchema2, {
  examples: [{ value: 'a' }],
  description: 'objectSchema',
})

const customSchema3 = z.number().transform(v => v.toString()).pipe(z.string())

JSON_SCHEMA_REGISTRY.add(customSchema3, {
  description: 'JSON_SCHEMA_REGISTRY',
})

JSON_SCHEMA_INPUT_REGISTRY.add(customSchema3, {
  description: 'JSON_SCHEMA_INPUT_REGISTRY',
  examples: [1],
})

JSON_SCHEMA_OUTPUT_REGISTRY.add(customSchema3, {
  description: 'JSON_SCHEMA_OUTPUT_REGISTRY',
  examples: ['1'],
})

testSchemaConverter([
  {
    name: 'customSchema1',
    schema: customSchema1,
    input: [true, { type: 'string', description: 'description', examples: ['a', 'b'] }],
  },
  {
    name: 'customSchema1_unsupported_examples',
    schema: customSchema1_unsupported_examples,
    input: [true, { type: 'string', description: 'description' }],
  },
  {
    name: 'customSchema2',
    schema: customSchema2,
    input: [true, {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
      description: 'objectSchema',
      examples: [{ value: 'a' }],
    }],
  },
  {
    name: 'customSchema3',
    schema: customSchema3,
    input: [true, { type: 'number', description: 'JSON_SCHEMA_INPUT_REGISTRY', examples: [1] }],
    output: [true, { type: 'string', description: 'JSON_SCHEMA_OUTPUT_REGISTRY', examples: ['1'] }],
  },
  {
    name: 'string.default("a")',
    schema: z.string().default('a'),
    input: [false, { default: 'a', type: 'string' }],
  },
  {
    name: 'string.prefault("a")',
    schema: z.string().prefault('a'),
    input: [false, { default: 'a', type: 'string' }],
  },
  {
    name: 'string.catch("a")',
    schema: z.string().catch('a'),
    input: [true, { type: 'string' }],
  },
  {
    name: 'string.readonly()',
    schema: z.string().readonly(),
    input: [true, { type: 'string', readOnly: true }],
  },
])
