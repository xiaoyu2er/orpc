import { useEffect, useState } from 'react'
import { client } from '../lib/orpc'

export function ChatRoom() {
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      for await (const message of await client.onMessage(undefined, { signal: controller.signal })) {
        setMessages(messages => [...messages, message.message])
      }
    })()

    return () => {
      controller.abort()
    }
  }, [])

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = new FormData(e.target as HTMLFormElement)
    const message = form.get('message') as string

    await client.sendMessage({ message })
  }

  return (
    <div>
      <h1>Chat Room</h1>
      <p>Open multiple tabs to chat together</p>
      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
      <form onSubmit={sendMessage}>
        <input name="message" type="text" required defaultValue="hello" />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
