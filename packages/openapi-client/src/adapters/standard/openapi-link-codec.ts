// import type { ClientContext, ClientOptions } from '@orpc/client'
// import type { StandardLinkCodec } from '@orpc/client/standard'
// import type { StandardHeaders, StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
// import { type ContractROuter, isContractProcedure } from '@orpc/contract'
// import { get, type Value } from '@orpc/shared'

// export interface OpenapiLinkCodecOptions<T extends ClientContext> {
//   /**
//    * Base url for all requests.
//    */
//   url: Value<string | URL, [
//     options: ClientOptions<T>,
//     path: readonly string[],
//     input: unknown,
//   ]>

//   /**
//    * Inject headers to the request.
//    */
//   headers?: Value<StandardHeaders, [
//     options: ClientOptions<T>,
//     path: readonly string[],
//     input: unknown,
//   ]>
// }

// export class OpenapiLinkCodec<T extends ClientContext> implements StandardLinkCodec<T> {
//   private readonly baseUrl: Exclude<OpenapiLinkCodecOptions<T>['url'], undefined>
//   private readonly headers: Exclude<OpenapiLinkCodecOptions<T>['headers'], undefined>

//   constructor(
//     private readonly contract: ContractROuter,
//     options: OpenapiLinkCodecOptions<T>,
//   ) {
//     this.baseUrl = options.url
//     this.headers = options.headers ?? {}
//   }

//   encode(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<StandardRequest> {
//     const procedure = get(this.contract, path)

//     if (!isContractProcedure(procedure)) {
//       throw new Error(`Not found contract procedure corresponding to the path: ${path.join('.')}`)
//     }

//     const httpPath = procedure['~orpc'].route.path ?? toO
//   }

//   decode(response: StandardLazyResponse, options: ClientOptions<T>, path: readonly string[], input: unknown): Promise<unknown> {

//   }
// }
