import { authed, pub } from '../orpc'

export const signup = pub.auth.signup.func(async (input, context, meta) => {
  return {
    id: '28aa6286-48e9-4f23-adea-3486c86acd55',
    email: input.email,
    name: input.name,
  }
})

export const signin = pub.auth.signin.func(async (input, context, meta) => {
  return {
    token: 'token',
  }
})

export const refresh = authed.auth.refresh.func(
  async (input, context, meta) => {
    return {
      token: 'new-token',
    }
  },
)

export const revoke = authed.auth.revoke.func(
  async (input, context, meta) => {
    // Do something
  },
)

export const me = authed.auth.me.func(async (input, context, meta) => {
  return context.user
})
