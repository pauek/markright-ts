import { promises as fs } from "fs";
import { parse, walk, symBlockElement, symInlineElement } from "../internal/index.js";

process.chdir("examples");
const filename = "html1.mr";

const htmlWalker = {
  [symBlockElement]: ({ name, args, children }) => {
    const sargs = args ? ` ${args}` : "";
    return `<${name}${sargs}>\n${children.join("\n")}\n</${name}>`;
  },
  [symInlineElement]: ({ name, args, children }) => {
    const sargs = args ? ` ${args}` : "";
    return `<${name}${sargs}>${children.join("")}</${name}>`;
  },
  pre: ({ children }) => `<pre>\n${children}</pre>`,
};

const main = async () => {
  const buffer = await fs.readFile(filename);
  const mr = parse(buffer.toString("utf8"));
  console.log(walk(mr, htmlWalker).join("\n\n"));
};

main();
