import { os } from '@orpc/server'
import { z } from 'zod'
import { createFormAction } from './form-action'

describe('createFormAction', () => {
  const procedure = os.input(z.object({
    big: z.bigint(),
  })).func(async ({ big }) => big)

  it('should accept form data and auto-convert types', async () => {
    const onSuccess = vi.fn()
    const formAction = createFormAction({ procedure, path: ['name'], onSuccess })

    const form = new FormData()
    form.append('big', '19992')

    await expect(formAction(form)).resolves.toEqual(undefined)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(BigInt('19992'), undefined, {
      path: [
        'name',
      ],
      procedure,
    })

    expect(formAction(new FormData())).rejects.toThrowError('Validation input failed')
  })

  it('hooks', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()

    const formAction = createFormAction({
      procedure,
      path: ['name'],
      onSuccess,
      onError,
    })

    const form = new FormData()
    form.append('big', '19992')

    await expect(formAction(form)).resolves.toEqual(undefined)

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(BigInt('19992'), undefined, {
      path: [
        'name',
      ],
      procedure,
    })
    expect(onError).not.toHaveBeenCalled()
  })
})
