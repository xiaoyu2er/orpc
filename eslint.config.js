import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  react: true,
  formatters: true,
}, {
  rules: {
    'ts/consistent-type-definitions': 'off',
    'react-refresh/only-export-components': 'off',
    'react/prefer-destructuring-assignment': 'off',
  },
}, {
  files: ['**/*.test.ts', '**/*.test.tsx', '**/*.test-d.ts', '**/*.test-d.tsx', 'apps/content/examples/**', 'playgrounds/**'],
  rules: {
    'unused-imports/no-unused-vars': 'off',
    'antfu/no-top-level-await': 'off',
  },
}, {
  files: ['apps/**', 'playgrounds/**'],
  rules: {
    'ts/explicit-function-return-type': 'off',
  },
}, {
  files: ['playgrounds/**'],
  rules: {
    'no-alert': 'off',
  },
})
