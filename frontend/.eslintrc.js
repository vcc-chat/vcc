/** @type {import("eslint").Linter.Config} */
// eslint-disable-next-line
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:import/recommended",
    "plugin:@typescript-eslint/recommended",
    "eslint-config-prettier"
  ],
  settings: {
    react: {
      version: "detect"
    },
    "import/resolver": {
      node: {
        paths: ["src"],
        extensions: [".js", ".jsx", ".ts", ".tsx"]
      }
    }
  },
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
    "no-empty": [
      "warn",
      {
        allowEmptyCatch: true
      }
    ],
    "@typescript-eslint/no-explicit-any": "off"
  }
}
