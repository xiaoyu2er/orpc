'use server'

// biome-ignore lint/correctness/noUnusedImports: <explanation>
import * as React from 'react'

import { os } from '@orpc/server'
import { oz } from '@orpc/zod'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export const createPost = os
  .input(
    z.object({
      nested: z.object({
        title: z.string(),
        description: z.string(),
        thumbs: z.array(oz.file().type('image/*')).nullable(),
      }),
    }),
  )
  .handler((input) => {
    redirect('/posts/new')
  })

export default async function Page() {
  const orYouCanCallDirectly = async () => {
    const files = (document.getElementById('files') as HTMLInputElement).files

    createPost({
      nested: {
        title: 'hello',
        description: 'world',
        thumbs: files ? [...files] : null,
      },
    })
  }

  // You can use square brackets to express nested data
  return (
    <form action={createPost}>
      <input type="text" name="nested[title]" required />
      <input type="text" name="nested[description]" required />
      <input
        id="files"
        type="file"
        name="nested[thumbs][]"
        multiple
        accept="image/*"
      />
    </form>
  )
}

//
//
