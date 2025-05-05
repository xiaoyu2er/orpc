import z from 'zod4'
import { testSchemaSmartCoercion } from '../../tests/shared'

testSchemaSmartCoercion([
  {
    name: 'number - 123',
    schema: z.number().or(z.string()),
    input: '123',
    expected: '123',
  },
  {
    name: 'boolean - true',
    schema: z.boolean().or(z.string()),
    input: 'true',
    expected: 'true',
  },
])
