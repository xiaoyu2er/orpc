'use client'

import { getting } from './actions'

export function OrpcServerAction() {
  const action = async (form: FormData) => {
    const name = form.get('name') as string
    const result = await getting({ name })
    alert(result)
  }

  return (
    <form action={action}>
      <input type="text" name="name" defaultValue="unnoq" required />
      <button type="submit">Test server action</button>
    </form>
  )
}
