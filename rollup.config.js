import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "./src/markright.ts",
    output: {
      file: "./dist/markright.js",
      format: "es",
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: "./tsconfig.json" })],
  },
  {
    input: "./dist/markright.d.ts",
    output: {
      file: "dist/markright.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];
