'use client'

import { getting } from './actions'

export function OrpcServerAction() {
  const action = async (form: FormData) => {
    const name = form.get('name') as string
    const [, message] = await getting({ name })
    alert(message)
  }

  return (
    <form action={action}>
      <input type="text" name="name" defaultValue="unnoq" required />
      <button type="submit">Test server action</button>
    </form>
  )
}
