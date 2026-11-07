import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      ".medusa/",
      ".cache/",
      "coverage/",
      "dist/",
      "static/",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // `any` defeats strict typing. Use `unknown` and narrow it instead.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Must stay last: turns off ESLint rules that would fight Prettier.
  prettier,
)