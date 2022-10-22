import {
  BlockElement,
  BlockItem,
  InlineItem,
  Paragraph,
  ElementArgs,
  InlineElement,
  Text,
} from "./model";

/*

El walker debería tener dos modelos de funcionamiento:

1) Recorrer cada nodo del árbol y devolver un resultado de cada nodo.
   Si se hace recursivamente se obtiene un resultado.
   Fácil de programar pero más lento.

2) El otro modo es recorrer el árbol depth-first, de forma que si quieres
   puedes usar la secuencia de llamadas para generar el resultado. 
   Este es el modo más rápido. Requiere una función para parsear los hijos,
   para poder decidir cuándo hacerlo.

El walker debería soportar los dos modos de trabajo... AHORA EL MODO 2 NO EXISTE AÚN!
Habrá que escoger, o sea hacer 2 walkers (dos funciones walk).

*/

type ElementChildren = string | BlockItem[] | InlineItem[] | null;

export const symText: unique symbol = Symbol("text");
export const symParagraph: unique symbol = Symbol("paragraph");
export const symBlockElement: unique symbol = Symbol("blockElement");
export const symBlockChildren: unique symbol = Symbol("blockItems");
export const symInlineElement: unique symbol = Symbol("inlineElement");
export const symInlineChildren: unique symbol = Symbol("inlineItems");

interface ElementFuncArgs {
  args: ElementArgs;
  children: ElementChildren;
}

interface TextFuncArgs {
  text: string;
}

interface GenericElementFuncArgs {
  name: string;
  args: ElementArgs;
  children: ElementChildren;
}

interface InlineChildrenFuncArgs {
  children: InlineItem[];
}

interface BlockChildrenFuncArgs {
  children: BlockItem[];
}

type FuncMap = {
  [name: string]: (params: ElementFuncArgs) => any;
  [symText]?: (params: TextFuncArgs) => any;
  [symBlockElement]?: (params: GenericElementFuncArgs) => any;
  [symInlineElement]?: (params: GenericElementFuncArgs) => any;
  [symParagraph]?: (params: InlineChildrenFuncArgs) => any;
  [symBlockChildren]?: (params: BlockChildrenFuncArgs) => any;
  [symInlineChildren]?: (params: InlineChildrenFuncArgs) => any;
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
    const result = func ? func({ text: text.text }) : text.text;
    return result;
  }

  walkInlineElement(elem: InlineElement): any {
    let children: any = elem.children;
    if (Array.isArray(children)) {
      children = this.walkInlineItems(children);
    }
    const func1 = this.getFuncByName(elem.name);
    if (func1) {
      return func1({ args: elem.args ?? null, children });
    }
    const func2 = this.funcMap[symInlineElement];
    if (func2) {
      const { name, args } = elem;
      return func2({ name, args, children });
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
    if (func) {
      return func({ children });
    }
    if (Array.isArray(children) && children.every(child => typeof child === "string")) {
      // Default paragraph behavior (trim + join)
      return children.map((s) => (s as Text).text.trim()).join(" ");
    }
    return children;
  }

  walkBlockElement(elem: BlockElement): any {
    let children: any = elem.children;
    if (Array.isArray(children)) {
      children = this.walkBlockItems(children);
    }
    const func1 = this.getFuncByName(elem.name);
    if (func1) {
      return func1({ args: elem.args ?? null, children });
    }
    const func2 = this.funcMap[symBlockElement];
    if (func2) {
      const { name, args } = elem;
      return func2({ name, args, children });
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
}

export const walk = (items: BlockItem[], funcMap: FuncMap) => {
  return new Walker(funcMap).walkBlockItems(items);
};
