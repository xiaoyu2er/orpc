/* eslint-disable no-restricted-imports */
import type { JSONSchema } from 'json-schema-typed/draft-2020-12'
import { Format as JSONSchemaFormat, keywords as JSONSchemaKeywords } from 'json-schema-typed/draft-2020-12'

export { JSONSchemaFormat, JSONSchemaKeywords }
export type { JSONSchema }

export type ObjectSchema = JSONSchema & { type: 'object' } & object
export type FileSchema = JSONSchema & { type: 'string', contentMediaType: string } & object

export const NON_LOGIC_KEYWORDS: string[] = [
  // Core Documentation Keywords
  '$anchor',
  '$comment',
  '$defs',
  '$id',
  'title',
  'description',

  // Value Keywords
  'default',
  'deprecated',
  'examples',

  // Metadata Keywords
  '$schema',
  'definitions', // Legacy, but still used
  'readOnly',
  'writeOnly',

  // Display and UI Hints
  'contentMediaType',
  'contentEncoding',
  'format',

  // Custom Extensions
  '$vocabulary',
  '$dynamicAnchor',
  '$dynamicRef',
] satisfies (typeof JSONSchemaKeywords)[number][]
