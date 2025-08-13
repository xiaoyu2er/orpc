import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  /**
   * Disable warnings as errors because we need to inline the `compression` package,
   * which is not ESModule-friendly.
   */
  failOnWarn: false,
})
