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
export type ElementChildren = Item[] | string;

export class Container {
  children: ElementChildren = null;

  constructor(children: Item[]) {
    this.children = children;
  }

  hasChildren(): boolean {
    return Array.isArray(this.children) && this.children.length > 0;
  }

  childrenToString(sep: string = ""): string {
    return Array.isArray(this.children)
      ? `${this.children.map((it) => it.toString()).join(sep)}`
      : `"${this.children}"`;
  }
}

export class Text {
  text: string = "";

  constructor(text: string) {
    this.text = text;
  }

  toString() {
    return `Text("${this.text}")`;
  }
}

export class Paragraph extends Container {
  children: InlineItem[];

  constructor(children: InlineItem[] = []) {
    super(children);
  }

  toString(): string {
    return `Paragraph(${this.childrenToString(", ")})`;
  }
}

export class Element extends Container {
  name: string;
  isRaw: boolean;
  args: string[];

  constructor(name: string, args: string[] = [], isRaw: boolean = false) {
    super([]);
    this.name = name;
    this.isRaw = isRaw;
    this.args = args;
  }

  toString(): string {
    const hasArgs = Array.isArray(this.args) && this.args.length > 0;
    const args = hasArgs ? `(${this.args.join(", ")})` : ``;
    return `${this.name}${args}`;
  }
}
export class BlockElement extends Element {
  children: BlockItem[] | string = null;

  toString(): string {
    return `Block/${super.toString()}[${this.childrenToString(", ")}]`;
  }
}
export class InlineElement extends Element {
  children: InlineItem[] | string = [];

  toString(): string {
    let children = "";
    if (typeof this.children === "string") {
      children = `"${this.children}"`;
    } else if (this.hasChildren()) {
      children = `[${this.childrenToString(", ")}]`;
    }
    return `Inline/${super.toString()}[${children}]`;
  }
}
