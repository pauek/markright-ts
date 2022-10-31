import {
  BlockElement,
  BlockItem,
  InlineItem,
  Paragraph,
  InlineElement,
  Text,
  Container,
  Item,
  RootElement,
} from "./model";

export const symText: unique symbol = Symbol("Text");
export const symParagraph: unique symbol = Symbol("Paragraph");
export const symBlockElement: unique symbol = Symbol("BlockElement");
export const symBlockChildren: unique symbol = Symbol("BlockItems");
export const symInlineElement: unique symbol = Symbol("InlineElement");
export const symInlineChildren: unique symbol = Symbol("InlineItems");

interface NameArg {
  name: string;
}
interface ElementArgs {
  args: string[];
  children: Item[];
}

interface TextArgs {
  text: string;
}

interface InlineChildrenArgs {
  children: InlineItem[];
}

interface BlockChildrenArgs {
  children: BlockItem[];
}

export type FuncMap = {
  [name: string]: (params: ElementArgs) => any;
  [symText]?: (params: TextArgs) => any;
  [symBlockElement]?: (params: NameArg & ElementArgs) => any;
  [symInlineElement]?: (params: NameArg & ElementArgs) => any;
  [symParagraph]?: (params: InlineChildrenArgs) => any;
  [symInlineChildren]?: (params: InlineChildrenArgs) => any;
  [symBlockChildren]?: (params: BlockChildrenArgs) => any;
};

class Walker {
  funcMap: FuncMap;

  constructor(funcMap: FuncMap) {
    this.funcMap = funcMap;
  }

  getFuncByName(name: string) {
    const sname = name as string;
    return sname in this.funcMap ? this.funcMap[sname] : null;
  }

  walkText(text: Text) {
    const func = this.funcMap[symText];
    return func ? func({ text: text.text }) : text.text;
  }

  walkInlineElement(elem: InlineElement): any {
    let children = elem.children;
    if (Array.isArray(children)) {
      children = this.walkInlineItems(children);
    }
    const namedFunc = this.getFuncByName(elem.name);
    if (namedFunc) {
      return namedFunc({ args: elem.args ?? null, children });
    }
    const symFunc = this.funcMap[symInlineElement];
    if (symFunc) {
      const { name, args } = elem;
      return symFunc({ name, args, children });
    }
    console.warn(`Warning: function for InlineElement '${elem.name}' not found`);
    return elem.children;
  }

  walkParagraph(paragraph: Paragraph) {
    let children: any = paragraph.children;
    if (Array.isArray(children)) {
      children = this.walkInlineItems(children);
    }
    const func = this.funcMap[symParagraph];
    if (func) {
      return func({ children });
    }
    if (Array.isArray(children) && children.every((child) => typeof child === "string")) {
      // Default paragraph behavior (trim + join)
      return children.map((s) => s.trim()).join(" ");
    }
    return children;
  }

  walkBlockElement(elem: BlockElement): any {
    let children = elem.children;
    if (Array.isArray(children)) {
      children = this.walkBlockItems(children);
    }
    const namedFunc = this.getFuncByName(elem.name);
    if (namedFunc) {
      return namedFunc({ args: elem.args ?? null, children });
    }
    const symFunc = this.funcMap[symBlockElement];
    if (symFunc) {
      const { name, args } = elem;
      return symFunc({ name, args, children });
    }
    console.log(`Warning: function for BlockElement '${elem.name}' not found`);
    return children;
  }

  walkInlineItems(inlineItems: InlineItem[]) {
    const children = inlineItems.map((item) => {
      if (item instanceof InlineElement) {
        return this.walkInlineElement(item);
      } else if (item instanceof Text) {
        return this.walkText(item);
      }
    });
    const func = this.funcMap[symInlineChildren];
    return func ? func({ children }) : children;
  }

  walkBlockItems(blockItems: BlockItem[]) {
    const children = blockItems.map((item) => {
      if (item instanceof BlockElement) {
        return this.walkBlockElement(item);
      } else if (item instanceof Paragraph) {
        return this.walkParagraph(item);
      }
    });
    const func = this.funcMap[symBlockChildren];
    return func ? func({ children }) : children;
  }

  walkRootElement(element: RootElement) {
    return this.walkBlockItems(element.children);
  }
}

export const walk = (tree: RootElement | BlockElement | InlineElement, funcMap: FuncMap) => {
  const walker = new Walker(funcMap);
  if (tree instanceof RootElement) {
    return walker.walkRootElement(tree);
  } else if (tree instanceof BlockElement) {
    return walker.walkBlockElement(tree);
  } else if (tree instanceof InlineElement) {
    return walker.walkInlineElement(tree);
  }
};

export const walkChildren = (
  tree: RootElement | BlockElement | InlineElement,
  funcMap: FuncMap
) => {
  const walker = new Walker(funcMap);
  if (tree instanceof RootElement) {
    return walker.walkBlockItems(tree.children);
  } else if (tree instanceof BlockElement) {
    return walker.walkBlockItems(tree.children);
  } else if (tree instanceof InlineElement) {
    return walker.walkInlineItems(tree.children);
  }
};
