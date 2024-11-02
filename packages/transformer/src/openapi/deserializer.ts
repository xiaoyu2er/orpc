/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import type { Deserializer } from '../types'

import cd from 'content-disposition'
import type { ZodType } from 'zod'
import * as BracketNotation from '../bracket-notation'
import type {} from '../types'
import { parseJSONSafely } from '../utils/json'
import { zodCoerce } from './zod-coerce'

export class OpenAPIDeserializer implements Deserializer {
  constructor(
    public options: {
      schema?: ZodType<any, any, any>
    } = {},
  ) {}

  async deserialize(re: Request | Response): Promise<unknown> {
    const contentType = re.headers.get('Content-Type')
    const contentDisposition = re.headers.get('Content-Disposition')
    const fileName = contentDisposition
      ? cd.parse(contentDisposition).parameters.filename
      : undefined

    if (fileName) {
      const blob = await re.blob()
      const file = new File([blob], fileName, {
        type: blob.type,
      })
      return this.options.schema ? zodCoerce(this.options.schema, file) : file
    }

    if (
      ('method' in re && re.method === 'GET') ||
      contentType?.startsWith('application/x-www-form-urlencoded')
    ) {
      const params =
        'method' in re && re.method === 'GET'
          ? new URLSearchParams(re.url.split('?')[1])
          : new URLSearchParams(await re.text())

      const data = BracketNotation.deserialize([...params.entries()])

      return this.options.schema
        ? zodCoerce(this.options.schema, data, { bracketNotation: true })
        : data
    }

    if (!contentType || contentType.startsWith('application/json')) {
      const text = await re.text()
      const data = parseJSONSafely(text)

      return this.options.schema ? zodCoerce(this.options.schema, data) : data
    }

    if (contentType.startsWith('text/')) {
      const data = await re.text()
      return this.options.schema
        ? zodCoerce(this.options.schema, data, { bracketNotation: true })
        : data
    }

    if (contentType.startsWith('multipart/form-data')) {
      const form = await re.formData()
      const data = BracketNotation.deserialize([...form.entries()])
      return this.options.schema
        ? zodCoerce(this.options.schema, data, { bracketNotation: true })
        : data
    }

    const blob = await re.blob()
    const data = new File([blob], 'blob', {
      type: blob.type,
    })
    return this.options.schema ? zodCoerce(this.options.schema, data) : data
  }
}
