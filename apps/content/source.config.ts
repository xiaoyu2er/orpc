import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins'
import {
  fileGenerator,
  remarkDocGen,
  remarkInstall,
  typescriptGenerator,
} from 'fumadocs-docgen'
import {
  defineCollections,
  defineConfig,
  defineDocs,
} from 'fumadocs-mdx/config'
import { transformerTwoslash } from 'fumadocs-twoslash'

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
})

export const home = defineCollections({
  type: 'doc',
  dir: 'content/home',
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash(),
      ],
    },
    remarkPlugins: [
      [
        remarkInstall,
        {
          persist: {
            id: 'pm',
          },
        },
      ],
      [
        remarkDocGen,
        { generators: [fileGenerator({ trim: false }), typescriptGenerator()] },
      ],
    ],
  },
})
