import { BlockElement, BlockItem, InlineItem, Paragraph, ElementArgs, InlineElement, Text } from "./model";

type ElementChildren = string | BlockItem[] | InlineItem[] | null;

type FuncMap = {
  [name: string]: (args: ElementArgs, children: ElementChildren) => void
}

class Walker {
  funcMap: FuncMap;

  constructor(funcMap: FuncMap) {
    this.funcMap = funcMap;
  }

  getFuncByName(name: string) {
    return name in this.funcMap ? this.funcMap[name] : null;
  }

  walkText(text: Text) {
    const func = this.getFuncByName("<text>");
    return func ? func(null, text.text) : text.text;
  }

  walkInlineElement(elem: InlineElement) {
    const func = this.getFuncByName(elem.name);
    if (func) {
      return func(elem.args ?? null, elem.children);
    }
    // FIXME: Qué hacer aquí?
    return `Warning: function for inlineElement ${elem.name} not found`;
  }

  walkParagraph(paragraph: Paragraph) {
    const func = this.getFuncByName("<paragraph>");
    if (func){
      return func(null, paragraph.children);
    } else {
      this.walkInlineItems(paragraph.children);
    }
  }
  
  walkBlockElement(elem: BlockElement) {
    const func = this.getFuncByName(elem.name) ?? this.getFuncByName("<blockElement>");
    if (func) {
      return func(elem.args ?? null, elem.children);
    }
    // FIXME: Qué hacer aquí?
    return `Warning: function for blockElement ${elem.name} not found`;
  }
  
  walkInlineItems(inlineItems: InlineItem[]) {
    for (const item of inlineItems) {
      if (item instanceof InlineElement) {
        this.walkInlineElement(item);
      } else if (item instanceof Text) {
        this.walkText(item);
      }
    }
  }

  walkBlockItems(blockItems: BlockItem[]) {
    for (const item of blockItems) {
      if (item instanceof BlockElement) {
        this.walkBlockElement(item);
      } else if (item instanceof Paragraph) {
        this.walkParagraph(item);
      }
    }
  }
}

export const walk = (items: BlockItem[], funcMap: FuncMap) => {
  new Walker(funcMap).walkBlockItems(items);
}


