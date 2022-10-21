import dts from "rollup-plugin-dts";
import sourcemaps from "rollup-plugin-sourcemaps";

export default [
  {
    input: "intermediate/markright.js",
    output: {
      file: 'internal/index.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [sourcemaps()],
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
