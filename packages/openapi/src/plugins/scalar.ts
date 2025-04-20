import type { Context, HTTPPath, Router } from '@orpc/server'
import type { StandardHandlerOptions, StandardHandlerPlugin } from '@orpc/server/standard'
import type { OpenAPIGeneratorGenerateOptions, OpenAPIGeneratorOptions } from '../openapi-generator'
import { standardizeHTTPPath } from '@orpc/openapi-client/standard'
import { stringifyJSON } from '@orpc/shared'
import { OpenAPIGenerator } from '../openapi-generator'

export interface ScalarApiReferencePluginOptions extends OpenAPIGeneratorOptions {
  /**
   * Options to pass to the OpenAPI generate.
   *
   */
  specGenerateOptions?: OpenAPIGeneratorGenerateOptions

  /**
   * The URL path at which to serve the OpenAPI JSON.
   * @default '/spec.json'
   */
  specPath?: HTTPPath

  /**
   * The URL path at which to serve the API reference UI.
   * @default '/'
   */
  docsPath?: HTTPPath

  /**
   * The document title for the API reference UI.
   * @default 'API Reference'
   */
  docsTitle?: string

  /**
   * Arbitrary configuration object for the UI.
   */
  docsConfig?: object

  /**
   * HTML to inject into the <head> of the docs page.
   */
  docsHead?: string

  /**
   * URL of the external script bundle for the reference UI.
   * @default 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'
   */
  docsScriptUrl?: string

  /**
   * Override function to generate the full HTML for the docs page.
   */
  renderDocsHtml?: (
    specUrl: string,
    title: string,
    head: string,
    scriptUrl: string,
    config?: object
  ) => string
}

export class ScalarApiReferencePlugin<T extends Context> implements StandardHandlerPlugin<T> {
  private readonly generator: OpenAPIGenerator
  private readonly specGenerateOptions: ScalarApiReferencePluginOptions['specGenerateOptions']
  private readonly specPath: Exclude<ScalarApiReferencePluginOptions['specPath'], undefined>
  private readonly docsPath: Exclude<ScalarApiReferencePluginOptions['docsPath'], undefined>
  private readonly docsTitle: Exclude<ScalarApiReferencePluginOptions['docsTitle'], undefined>
  private readonly docsHead: Exclude<ScalarApiReferencePluginOptions['docsHead'], undefined>
  private readonly docsScriptUrl: Exclude<ScalarApiReferencePluginOptions['docsScriptUrl'], undefined>
  private readonly docsConfig?: ScalarApiReferencePluginOptions['docsConfig']
  private readonly renderDocsHtml: NonNullable<ScalarApiReferencePluginOptions['renderDocsHtml']>

  constructor(options: ScalarApiReferencePluginOptions = {}) {
    this.specGenerateOptions = options.specGenerateOptions
    this.docsPath = options.docsPath ?? '/'
    this.docsTitle = options.docsTitle ?? 'API Reference'
    this.docsConfig = options.docsConfig
    this.docsScriptUrl = options.docsScriptUrl ?? 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'
    this.docsHead = options.docsHead ?? ''
    this.specPath = options.specPath ?? '/spec.json'
    this.generator = new OpenAPIGenerator(options)

    this.renderDocsHtml = options.renderDocsHtml ?? this.defaultRenderHtml.bind(this)
  }

  init(options: StandardHandlerOptions<T>, router: Router<any, T>): void {
    options.interceptors ??= []
    let spec: Awaited<ReturnType<typeof this.generator.generate>>

    options.interceptors.push(async (options) => {
      const res = await options.next()

      if (res.matched) {
        return res
      }

      const prefix = options.prefix ?? ''
      const docsUrl = new URL(standardizeHTTPPath(`${prefix}${this.docsPath}`), options.request.url.origin)
      const specUrl = new URL(standardizeHTTPPath(`${prefix}${this.specPath}`), options.request.url.origin)

      if (options.request.url.pathname === docsUrl.pathname) {
        const html = this.renderDocsHtml(
          specUrl.toString(),
          this.docsTitle,
          this.docsHead,
          this.docsScriptUrl,
          this.docsConfig,
        )

        return {
          matched: true,
          response: {
            status: 200,
            headers: {},
            body: new File([html], 'api-reference.html', { type: 'text/html' }),
          },
        }
      }

      if (options.request.url.pathname === specUrl.pathname) {
        spec ??= await this.generator.generate(router, {
          servers: [{ url: new URL(prefix, options.request.url.origin).toString() }],
          ...this.specGenerateOptions,
        })

        return {
          matched: true,
          response: {
            status: 200,
            headers: {},
            body: new File([stringifyJSON(spec)], 'spec.json', { type: 'application/json' }),
          },
        }
      }

      return res
    })
  }

  private defaultRenderHtml(
    specUrl: string,
    title: string,
    head: string,
    scriptUrl: string,
    config?: object,
  ): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return `
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>${esc(title)}</title>
                ${head}
            </head>
            <body>
                <script 
                    id="api-reference" 
                    data-url="${esc(specUrl)}"
                    ${config ? ` data-configuration="${esc(stringifyJSON(config))}"` : ''}
                ></script>
                <script src="${esc(scriptUrl)}"></script>
            </body>
        </html>
        `
  }
}
