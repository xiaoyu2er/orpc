import cd from 'content-disposition'
import * as BracketNotation from './bracket-notation'

export class OpenAPIBodyCodec {
  encode(payload: unknown): undefined | Blob | FormData {
  }

  private encodeAsJSON(payload: unknown): Blob {
  }

  private encodeAsMultipartFormData(payload: unknown): FormData {
  }

  private encodeAsURLEncoded(payload: unknown): Blob {
  }

  private encodeAsBlob(payload: Blob): Blob {
    return payload
  }

  private getBlobContentType(blob: Blob): string {
    return blob.type || 'application/octet-stream'
  }

  async decode(re: Request | Response): Promise<unknown> {
    if ('method' in re && re.method === 'GET') {
      return undefined
    }

    const contentType = re.headers.get('Content-Type')
    const contentDisposition = re.headers.get('Content-Disposition')
    const fileName = contentDisposition ? cd.parse(contentDisposition).parameters.filename : undefined

    if (fileName) {
      const blob = await re.blob()
      const file = new File([blob], fileName, {
        type: blob.type,
      })
      return file
    }

    if (!contentType || contentType.startsWith('application/json')) {
      const text = await re.text()

      if (text === '') {
        return undefined
      }

      const data = JSON.parse(text)
      return data
    }

    if (contentType.startsWith('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(await re.text())
      const data = BracketNotation.deserialize([...params.entries()])
      return data
    }

    if (contentType.startsWith('text/')) {
      const text = await re.text()
      return text
    }

    if (contentType.startsWith('multipart/form-data')) {
      const form = await re.formData()
      return this.decodeAsFormData(form)
    }

    const blob = await re.blob()
    const file = new File([blob], 'blob', {
      type: blob.type,
    })

    return file
  }

  decodeAsFormData(form: FormData): unknown {
    return BracketNotation.deserialize([...form.entries()])
  }
}
