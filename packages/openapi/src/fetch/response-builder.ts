export class OpenAPIResponseBuilder {
  build(output: unknown): Response {
    return new Response(JSON.stringify(output)) // TODO
  }
}
