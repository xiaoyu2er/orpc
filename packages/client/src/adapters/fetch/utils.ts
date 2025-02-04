import cd from 'content-disposition'

export async function parseRPCResponse(response: Response): Promise<unknown> {
  const contentDisposition = response.headers.get('content-disposition')
  const fileName = contentDisposition ? cd.parse(contentDisposition).parameters.filename : undefined

  if (fileName) {
    const blob = await response.blob()
    return new File([blob], fileName, {
      type: blob.type,
    })
  }

  const contentType = response.headers.get('content-type')

  if (contentType?.startsWith('application/json')) {
    return response.json()
  }

  if (contentType?.startsWith('multipart/form-data')) {
    return response.formData()
  }

  const blob = await response.blob()
  return new File([blob], 'blob', {
    type: blob.type,
  })
}
