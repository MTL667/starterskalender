import nextVitals from 'eslint-config-next/core-web-vitals'

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextVitals,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '_tmp/**',
      '_bmad/**',
      '_bmad-output/**',
      'prisma/migrations/**',
      'migrations/**',
    ],
  },
  {
    // React Compiler rules from eslint-plugin-react-hooks@7 are new vs our
    // ESLint 8 baseline. Keep as warnings so the ESLint 9 tooling upgrade
    // can ship without a broad React rewrite across the app.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]

export default config
