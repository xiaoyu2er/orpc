'use server'

import { os } from '@orpc/server'
import { redirect } from 'next/navigation'

export const pong = os.func(async () => {
  return 'pong'
})

export const visitScalar = os.func(async () => {
  redirect('/scalar')
})
