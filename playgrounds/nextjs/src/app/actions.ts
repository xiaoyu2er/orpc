'use server'

import { os } from '@orpc/server'
import { redirect } from 'next/navigation'

export const pong = os.handler(async () => {
  return 'pong'
})

export const visitScalar = os.handler(async () => {
  redirect('/scalar')
})
