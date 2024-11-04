import { getCustomZodFileMimeType, getCustomZodType, oz } from '../src'

const testFile = new File([], 'test.txt')
const textFile = new File([], 'test.txt', { type: 'text/plain' })
const imageFile = new File([], 'test.jpg', { type: 'image/jpeg' })
const testBlob = new Blob(['hello world'], { type: 'text/plain' })
const invalidDate = new Date('invalid date')
const validDate = new Date()
const testRegex = /test/
const testUrl = new URL('https://example.com')

const cases = [
  // File tests
  ['File', oz.file(), testFile, undefined, undefined],
  ['File', oz.file('Custom error'), 'not a file', undefined, 'Custom error'],
  ['File', oz.file().type('text/plain'), textFile, 'text/plain', undefined],
  [
    'File',
    oz.file().type('text/plain'),
    testFile,
    'text/plain',
    'Expected a file of type text/plain but got a file of type unknown',
  ],
  [
    'File',
    oz.file().type('text/plain'),
    imageFile,
    'text/plain',
    'Expected a file of type text/plain but got a file of type image/jpeg',
  ],
  ['File', oz.file().type('image/*'), imageFile, 'image/*', undefined],
  [
    'File',
    oz.file().type('image/*'),
    textFile,
    'image/*',
    'Expected a file of type image/* but got a file of type text/plain',
  ],
  [
    'File',
    oz.file().type('text/plain', 'Custom mime type error'),
    imageFile,
    'text/plain',
    'Custom mime type error',
  ],

  // Blob tests
  ['Blob', oz.blob(), testBlob, undefined, undefined],
  ['Blob', oz.blob(), 'not a blob', undefined, 'Input is not a blob'],
  [
    'Blob',
    oz.blob('Custom blob error'),
    'not a blob',
    undefined,
    'Custom blob error',
  ],

  // Invalid Date tests
  ['Invalid Date', oz.invalidDate(), invalidDate, undefined, undefined],
  [
    'Invalid Date',
    oz.invalidDate(),
    validDate,
    undefined,
    'Input is not an invalid date',
  ],
  [
    'Invalid Date',
    oz.invalidDate('Custom date error'),
    validDate,
    undefined,
    'Custom date error',
  ],

  // RegExp tests
  ['RegExp', oz.regexp(), testRegex, undefined, undefined],
  ['RegExp', oz.regexp(), 'not a regex', undefined, 'Input is not a regexp'],
  [
    'RegExp',
    oz.regexp({ message: 'Custom regex error' }),
    'not a regex',
    undefined,
    'Custom regex error',
  ],

  // URL tests
  ['URL', oz.url(), testUrl, undefined, undefined],
  ['URL', oz.url(), 'not a url', undefined, 'Input is not a URL'],
  [
    'URL',
    oz.url({ message: 'Custom URL error' }),
    'not a url',
    undefined,
    'Custom URL error',
  ],
] as const

describe('Custom Zod Types', () => {
  it.each(cases)(
    'should validate %s',
    (name, schema, value, mimeType, errorMessage) => {
      expect(getCustomZodType(schema._def)).toEqual(name)
      expect(getCustomZodFileMimeType(schema._def)).toEqual(mimeType)

      if (!errorMessage) {
        expect(schema.safeParse(value)).toEqual({
          success: true,
          data: value,
        })
      } else {
        expect(schema.safeParse(value).error?.issues[0]?.message).toEqual(
          errorMessage,
        )
      }
    },
  )
})
