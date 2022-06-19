import {
  BlockElement,
  BlockItem,
  InlineItem,
  Paragraph,
  ElementArgs,
  InlineElement,
  Text,
} from "./model";

type ElementChildren = string | BlockItem[] | InlineItem[] | null;

export const symText: unique symbol = Symbol("text");
export const symParagraph: unique symbol = Symbol("paragraph");
export const symBlockElement: unique symbol = Symbol("blockElement");
export const symBlockChildren: unique symbol = Symbol("blockItems");
export const symInlineElement: unique symbol = Symbol("inlineElement");
export const symInlineChildren: unique symbol = Symbol("inlineItems");

type FuncMap = {
  [name: string]: (args: ElementArgs, children: ElementChildren) => any;
  [symText]?: (text: string) => any;
  [symBlockElement]?: (name: string, args: ElementArgs, children: ElementChildren) => any;
  [symInlineElement]?: (name: string, args: ElementArgs, children: ElementChildren) => any;
  [symParagraph]?: (children: InlineItem[]) => any;
  [symBlockChildren]?: (children: BlockItem[]) => any;
  [symInlineChildren]?: (children: InlineItem[]) => any;
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
    const result = func ? func(text.text) : text.text;
    return result;
  }

  walkInlineElement(elem: InlineElement): any {
    let children: any = elem.children;
    if (Array.isArray(children)) {
      children = this.walkInlineItems(children);
    }
    const func1 = this.getFuncByName(elem.name);
    if (func1) {
      return func1(elem.args ?? null, children);
    }
    const func2 = this.funcMap[symInlineElement];
    if (func2) {
      return func2(elem.name, elem.args, children);
    }
    console.warn(`Warning: function for InlineElement '${elem.name}' not found`);
    return elem.children;
  }

  walkParagraph(paragraph: Paragraph) {
    let children = paragraph.children;
    if (Array.isArray(children)) {
      children = this.walkInlineItems(children);
    }
    const func = this.funcMap[symParagraph];
    return func ? func(children) : children;
  }

  walkBlockElement(elem: BlockElement): any {
    let children: any = elem.children;
    if (Array.isArray(children)) {
      children = this.walkBlockItems(children);
    }
    const func1 = this.getFuncByName(elem.name);
    if (func1) {
      return func1(elem.args ?? null, children);
    }
    const func2 = this.funcMap[symBlockElement];
    if (func2) {
      return func2(elem.name, elem.args, children);
    }
    console.log(`Warning: function for BlockElement '${elem.name}' not found`);
    return children;
  }

  walkInlineItems(inlineItems: InlineItem[]) {
    const results = inlineItems.map((item) => {
      if (item instanceof InlineElement) {
        return this.walkInlineElement(item);
      } else if (item instanceof Text) {
        return this.walkText(item);
      }
    });
    const func = this.funcMap[symInlineChildren];
    return func ? func(results) : results;
  }

  walkBlockItems(blockItems: BlockItem[]) {
    const results = blockItems.map((item) => {
      if (item instanceof BlockElement) {
        return this.walkBlockElement(item);
      } else if (item instanceof Paragraph) {
        return this.walkParagraph(item);
      }
    });
    const func = this.funcMap[symBlockChildren];
    return func ? func(results) : results;
  }
}

export const walk = (items: BlockItem[], funcMap: FuncMap) => {
  return new Walker(funcMap).walkBlockItems(items);
};
