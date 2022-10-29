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

export class Container<T extends Item> {
  children: T[] = null;

  constructor(children: T[]) {
    this.children = children;
  }

  get hasChildren(): boolean {
    return Array.isArray(this.children) && this.children.length > 0;
  }

  get innerText(): string {
    let text = "";
    for (const item of this.children) {
      if (typeof item === "string") {
        text += item;
      } else {
        text += item.innerText;
      }
    }
    return text;
  }

  query(q: string): Item {
    const ids = q.split(" ");
    for (const item of this.children) {
      if (item instanceof Element && item.name === ids[0]) {
        if (ids.length > 1) {
          return item.query(ids.slice(1).join(" "));
        } else {
          return item;
        }
      }
    }
    return null;
  }

  queryAll(q: string): Item[] {
    if (q === "") {
      return [this as Item];
    }
    const ids = q.split(" ");
    const qhead = ids[0];
    const qrest = ids.slice(1).join("");

    const match = (item: Item) => {
      if (item instanceof Element && item.name === qhead) {
        return true;
      } else if (qhead === "<Text>" && item instanceof Text) {
        return true;
      } else if (qhead === "<Paragraph>" && item instanceof Paragraph) {
        return true;
      } else if (qhead === "<BlockElement>" && item instanceof BlockElement) {
        return true;
      } else if (qhead === "<InlineElement>" && item instanceof InlineElement) {
        return true;
      }
      return false;
    };

    let result: Item[] = [];
    for (const item of this.children) {
      if (!(typeof item === "string")) {
        if (item instanceof Text) {
          if (match(item)) {
            result.push(item);
          }
        } else {
          const qnext = match(item) ? qrest : q;
          result = [...result, ...item.queryAll(qnext)];
        }
      }
    }
    return result;
  }
}

export class Text {
  text: string = "";

  constructor(text: string) {
    this.text = text;
  }

  get innerText(): string {
    return this.text;
  }
}

export class Paragraph extends Container<InlineItem> {
  constructor(children: InlineItem[] = []) {
    super(children);
  }
}

export class RootElement extends Container<BlockItem> {
  constructor(children: BlockItem[] = []) {
    super(children);
  }
}

export class Element<T extends Item> extends Container<T> {
  name: string;
  isRaw: boolean;
  args: string[];

  constructor(name: string, args: string[] = [], isRaw: boolean = false) {
    super([]);
    this.name = name;
    this.isRaw = isRaw;
    this.args = args;
  }
}
export class BlockElement extends Element<BlockItem> {}
export class InlineElement extends Element<InlineItem> {}
