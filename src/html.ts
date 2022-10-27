import { symBlockElement, symInlineElement } from "./walk";

export const htmlFuncMap = {
  [symBlockElement]: ({ name, args, children }) => {
    const sargs = args ? ` ${args}` : "";
    const strChildren = typeof children === "string" ? children : children.join("\n");
    return `<${name}${sargs}>`+ "\n" + strChildren + "\n" + `</${name}>`;
  },
  [symInlineElement]: ({ name, args, children }) => {
    const sargs = args ? ` ${args}` : "";
    return `<${name}${sargs}>${children.join("")}</${name}>`;
  },
};
