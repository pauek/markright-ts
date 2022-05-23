/*

Item
InlineItem : Item
BlockItem : Item

Container {
  children: []Item
}
Text : InlineItem {
  text: string
}
Paragraph : Container {
  children: []InlineItem
} 
Element : Container {
  name, args: string
}
InlineElement : Element, InlineItem {
  children: []InlineItem
}
BlockElement : Element, BlockItem {
  children: []BlockItem
}

*/

export type BlockItem = BlockElement | Paragraph;
export type InlineItem = InlineElement | Text;
export type Item = BlockItem | InlineItem;

export abstract class Container {
  children: Item[] | string | null = null;

  childrenToString(ind: string, sep: string): string {
    if (Array.isArray(this.children)) {
      return `${this.children.map((it) => it.toString(ind)).join(sep)}`;
    } else {
      return `"${this.children}"`;
    }
  }
}

export class Text {
  text: string = "";

  constructor(text: string) {
    this.text = text;
  }

  toString(ind: string) {
    return `${ind}"${this.text}"`;
  }
}

export class Paragraph extends Container {
  children: InlineItem[];

  constructor(children: InlineItem[] = []) {
    super();
    this.children = children;
  }

  toString(ind: string) {
    return `${ind}P\n${this.childrenToString(ind + "  ", "\n")}`;
  }
}

type ElementArgs = string[] | null;
export class Element extends Container {
  name: string = "";
  args?: ElementArgs;

  constructor(name: string, args?: ElementArgs) {
    super();
    this.name = name;
    if (args) {
      this.args = args;
    }
  }

  toString(ind: string = ""): string {
    const args = this.args ? `(${this.args.join(", ")})` : "";
    return `${this.name}${args}`;
  }
}
export class BlockElement extends Element {
  children: BlockItem[] | string = [];

  constructor(name: string, args: ElementArgs, children: BlockItem[] | string) {
    super(name, args);
    this.children = children;
  }

  toString(ind: string): string {
    return `${ind}B.${super.toString()}\n${this.childrenToString(ind + "  ", "\n")}`;
  }
}
export class InlineElement extends Element {
  children: InlineItem[] | string | null = [];

  constructor(name: string, args: ElementArgs, children: InlineItem[] | string) {
    super(name, args);
    this.children = children;
  }

  toString(ind: string): any {
    let children = "";
    if (typeof this.children === "string") {
      children = `"${this.children}"`;
    } else if (Array.isArray(this.children) && this.children.length > 0) {
      children = `[${this.childrenToString("", ", ")}]`;
    }
    return `${ind}I.${super.toString()}${children}`;
  }
}
