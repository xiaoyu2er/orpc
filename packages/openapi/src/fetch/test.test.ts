it('dd', async () => {
  const blob = new Blob(['the content type'], { type: 'application/xml' })

  const request = new Request('https://dfdsfsd', {
    body: blob,
    method: 'POST',
  })

  console.log(request.headers.get('Content-Type'))
})
