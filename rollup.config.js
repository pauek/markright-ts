import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json";

export default [
  {
    input: "src/markright.ts",
    plugins: [resolve(), commonjs(), typescript()],
    output: {
      name: "markright",
      file: pkg.browser,
      format: "umd",
      sourcemap: true,
    },
  },
  {
    input: "src/markright.ts",
    external: ["ms"],
    plugins: [typescript()],
    output: { file: pkg.module, format: "es", sourcemap: true },
  },
  // Tests
  {
    input: "test/test.ts",
    plugins: [resolve(), typescript()],
    output: { file: "dist/test.js", format: "es", sourcemap: true },
  },
];
