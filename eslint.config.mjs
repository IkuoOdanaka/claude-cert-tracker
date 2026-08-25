import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 は flat config をそのまま export するため、
// @eslint/eslintrc の FlatCompat は不要になった。
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // 静的コンテンツの読み込み口を src/lib/content.ts 1つに保つ。
    // 画面側が data/*.json を直接 import すると型が広がり、キャストが散らばる。
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/content.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/data/*.json", "**/data/**/*.json"],
              message:
                "data/*.json は直接 import せず、@/lib/content を経由してください。",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
