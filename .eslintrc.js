module.exports = {
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-typescript', // Uses the rules from eslint-config-airbnb-typescript
    'airbnb/hooks', // Uses the react hooks rules from eslint-config-airbnb-typescript
    'plugin:eslint-comments/recommended', // Uses the recommended rules from @eslint-plugin-eslint-comments
    'plugin:jest/recommended', // Uses the recommended rules from @eslint-plugin-jest
    'plugin:promise/recommended', // Uses the recommended rules from @eslint-plugin-promise
    'plugin:unicorn/recommended', // Uses the recommended rules from @eslint-plugin-unicorn
    'prettier/react', // Uses eslint-config-prettier to disable ESLint rules from @eslint-plugin-react that would conflict with prettier
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from @typescript-eslint/eslint-plugin
    'prettier/@typescript-eslint', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    project: 'tsconfig.json',
    ecmaVersion: 2020,
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['prettier', 'react', '@typescript-eslint', 'import', 'jsx-a11y'],
  rules: {
    indent: [2, 2],
    'jsx-quotes': ['warn', 'prefer-single'],
    'newline-before-return': ['warn'],
    'no-console': 'warn',
    'no-shadow': 'warn',
    'prettier/prettier': 'warn',
    'react/jsx-first-prop-new-line': [1, 'multiline-multiprop'],
    'react/jsx-max-props-per-line': [1, { maximum: 2, when: 'multiline' }],
    'prefer-destructuring': [
      'warn',
      {
        VariableDeclarator: {
          array: false,
          object: true,
        },
        AssignmentExpression: {
          array: false,
          object: false,
        },
      },
    ],
    'jsx-a11y/alt-text': [
      2,
      {
        img: ['ExpertImage'],
      },
    ],
    'import/extensions': [
      'warn',
      'ignorePackages',
      {
        ts: 'never',
        tsx: 'never',
      },
    ],
    '@typescript-eslint/lines-between-class-members': 0,
    '@typescript-eslint/naming-convention': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/no-unused-vars': 0,
    'arrow-body-style': 0,
    'class-methods-use-this': 0,
    'function-call-argument-newline': 0,
    'import/no-extraneous-dependencies': 0,
    'import/prefer-default-export': 0,
    'lines-between-class-members': 0,
    'max-classes-per-file': 0,
    'no-case-declarations': 0,
    'no-nested-ternary': 0,
    'no-param-reassign': 0,
    'no-plusplus': 0,
    'no-restricted-syntax': 0,
    'no-underscore-dangle': 0,
    'no-use-before-define': 0,
    'prefer-const': 0,
    'react/display-name': 0,
    'react/jsx-filename-extension': 0,
    'react/jsx-props-no-spreading': 0,
    'react/prop-types': 0,
    'react/static-property-placement': 0,
    'unicorn/consistent-destructuring': 0,
    'unicorn/filename-case': 0,
    'unicorn/no-array-callback-reference': 0,
    'unicorn/no-array-for-each': 0,
    'unicorn/no-array-reduce': 0,
    'unicorn/no-nested-ternary': 0,
    'unicorn/number-literal-case': 0,
    'unicorn/prefer-dom-node-remove': 0,
    'unicorn/prevent-abbreviations': 0,
  },
  ignorePatterns: ['react-app-env.d.ts'],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.d.ts', '.ts', '.tsx'],
        paths: ['src'],
      },
    },
  },
};
