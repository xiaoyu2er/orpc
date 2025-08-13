import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  /**
   * Disable warnings to allow inlining all devDependencies packages
   */
  failOnWarn: false,
})
