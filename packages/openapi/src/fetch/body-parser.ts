import cd from 'content-disposition'

export class OpenAPIBodyParser {
  async parse(request: Request): Promise<unknown> {
    const contentType = request.headers.get('content-type')
    const contentDisposition = request.headers.get('content-disposition')
    const fileName = contentDisposition ? cd.parse(contentDisposition).parameters.filename : undefined

    if (fileName) {
      const blob = await request.blob()
      const file = new File([blob], fileName, {
        type: blob.type,
      })
      return file
    }

    if (!contentType || contentType.startsWith('application/json')) {
      const text = await request.text()

      if (text === '') {
        return undefined
      }

      const json = JSON.parse(text)
      return json
    }

    if (contentType.startsWith('text/')) {
      const text = await request.text()
      return text
    }

    if (contentType.startsWith('multipart/form-data')) {
      const form = await request.formData()
      return form
    }

    const blob = await request.blob()
    const file = new File([blob], 'blob', {
      type: blob.type,
    })
    return file
  }
}
