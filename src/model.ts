export class Item {
  rawChildren: string = "";

  addRaw(str: string) {
    if (this.rawChildren === undefined) {
      this.rawChildren = "";
    }
    this.rawChildren += str + "\n";
  }
  hasRawChildren() {
    return this.rawChildren !== undefined;
  }

  toJson() {
    throw new Error(`Item.toJson is abstract! (obj = ${JSON.stringify(this)})`);
  }
}

export class Text extends Item {
  text: any;

  constructor(text: string) {
    super();
    this.text = text;
  }
  toJson() {
    return `"${this.text}"`;
  }
}

class _List extends Item {
  children?: Item[];

  constructor(children?: Item[]) {
    super();
    if (children) this.children = children;
  }
  hasChildren() {
    return this.children ? this.children.length > 0 : false;
  }
  toJson() {
    return `[${
      this.children ? this.children.map(x => x.toJson()).join(",") : ""
    }]`;
  }
  add(item: Item) {
    this.children = [...(this.children || []), item];
  }
}

export class Block extends _List {}

export class Line extends _List {
  // = List<InlineItem>

  isSingle() {
    return this.children && this.children.length === 1;
  }
  isSingleCommand() {
    return (
      this.isSingle() && this.children && this.children[0] instanceof Command
    );
  }
  isSingleBlockCommand() {
    return (
      this.isSingle() &&
      this.children &&
      this.children[0] instanceof BlockCommand
    );
  }

  allCommandsToInlineCommands() {
    if (this.children) {
      this.children = this.children.map(item => {
        return item instanceof Command ? item.toInlineCommand() : item;
      });
    }
  }

  executeAllCommands(execFunc: Function) {
    if (this.children) {
      this.children = this.children.map(item => {
        return item instanceof Command ? execFunc(item) : item;
      });
    }
  }
}

export class Command extends Item {
  name: string;
  args: string[] | null;
  delim?: {
    open: string;
    close: string;
  };
  children?: Item;

  constructor(name: string, args: string[] | null) {
    super();
    this.name = name;
    this.args = args;
  }
  toJson() {
    let json = `{"cmd":"${this.name}"`;
    if (this.args)
      json += `,"args":[${this.args.map(x => `"${x}"`).join(",")}]`;
    if (this.delim)
      json += `,"delim":{"open":"${this.delim.open}","close":"${this.delim.close}"}`;
    if (this.children) {
      if (this.children instanceof _List) {
        if (this.children.hasChildren()) {
          json += `,"children":${this.children.toJson()}`;  
        }
      } else {
        json += `,"children":${this.children.toJson()}`;
      }
    }
    json += `}`;
    return json;
  }
  toInlineCommand() {
    return new InlineCommand(this.name, this.args);
  }
  toBlockCommand() {
    return new BlockCommand(this.name, this.args);
  }
}

export class BlockCommand extends Command {
  constructor(name: string, args: string[] | null) {
    super(name, args);
  }
}

export class InlineCommand extends Command {
  constructor(
    name: string,
    args: string[] | null,
    rawChildren?: string,
    delim?: { open: string; close: string }
  ) {
    super(name, args);
    if (rawChildren) this.rawChildren = rawChildren;
    if (delim) this.delim = delim;
  }
  toInlineCommand() {
    return this;
  }
}
