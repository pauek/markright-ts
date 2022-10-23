import dts from "rollup-plugin-dts";
import sourcemaps from "rollup-plugin-sourcemaps";

export default [
  {
    input: "dist/markright.js",
    output: {
      file: 'dist/index.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [sourcemaps()],
  },
  {
    input: "dist/markright.js",
    output: {
      file: "dist/index.d.ts",
      format: "es"
    },
    plugins: [dts()],
  }
]
