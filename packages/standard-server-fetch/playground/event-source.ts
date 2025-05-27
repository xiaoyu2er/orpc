Bun.serve({
  async fetch(request) {
    console.log('fetch')
    request.signal.addEventListener('abort', () => {
      console.log('abort')
    })

    await new Promise(r => setTimeout(r, 5000))

    return new Response('success')
  },
  port: 3000,
})

console.log('Serve at http://localhost:3000')
