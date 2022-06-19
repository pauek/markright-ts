import dts from "rollup-plugin-dts";

export default [
  {
    input: "intermediate/markright.js",
    output: {
      file: 'internal/index.js',
      format: 'esm',
    },
  },
  {
    input: "intermediate/markright.d.ts",
    output: {
      file: "internal/index.d.ts",
      format: "es"
    },
    plugins: [dts()],
  }
]
