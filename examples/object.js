import { promises as fs } from "fs";
import {
  parse,
  walk,
  symBlockElement,
  symInlineElement,
  symParagraph,
  symText,
} from "../internal/index.js";

process.chdir("examples");
const filename = "object.mr";

const merge = (objects) => Object.assign({}, ...objects);
const nodeFunc = ({ name, children }) => ({ [name]: merge(children) });

const convert = (args, text) => {
  if (text === undefined) {
    // A symbol without content is a "present" boolean property
    return true;
  }
  const type = args ? args[0] : null;
  switch (type) {
    case "double":
    case "int": {
      const result = Number(text);
      if (Number.isNaN(result)) {
        throw new Error(`Not a number: '${text}'`);
      }
      return result;
    }
    case "bool": {
      if (text === "true" || text === "false") {
        return text === "true";
      }
      throw new Error("bool can only be 'true' or 'false'");
    }
    default:
      return text;
  }
};

const objectWalker = {
  [symBlockElement]: nodeFunc,
  [symInlineElement]: ({ name, args, children }) => ({
    [name]: convert(args, children[0]),
  }),
  [symParagraph]: ({ children }) => merge(children),
  [symText]: ({ text }) => text,
};

const main = async () => {
  const buffer = await fs.readFile(filename);
  const mr = parse(buffer.toString("utf8"));
  const result = merge(walk(mr, objectWalker));
  console.dir(result, { depth: null });
};

main();
