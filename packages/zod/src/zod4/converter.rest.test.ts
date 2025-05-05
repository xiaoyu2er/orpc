import z from 'zod4'
import { testSchemaConverter } from '../../tests/shared'

testSchemaConverter([
  {
    name: 'z.symbol()',
    schema: z.symbol(),
    input: [true, { not: {} }],
  },
  {
    name: 'z.promise(z.string())',
    schema: z.promise(z.string()),
    input: [true, { not: {} }],
  },
  {
    name: 'z.custom(() => false)',
    schema: z.custom(() => false),
    input: [true, { not: {} }],
  },
])
