import {
  Element,
  InlineItem,
  InlineElement,
  BlockItem,
  BlockElement,
  Text,
  Paragraph,
} from "./model";

class Printer {
  indentLevel: number = 0;
  write: (s: string) => void;

  constructor(write: (s: string) => void) {
    this.write = write;
  }

  indent(n: number) {
    this.indentLevel += n;
  }

  startLine() {
    this.write("  ".repeat(this.indentLevel));
  }

  endLine() {
    this.write("\n");
  }

  writeLine(x: string) {
    this.startLine();
    this.write(`${x}`);
    this.endLine();
  }

  withIndent(fn: () => void) {
    this.indent(+1);
    fn();
    this.indent(-1);
  }

  printHead(elem: Element) {
    const args = elem.args ? `(${elem.args.join(", ")})` : "";
    this.write(`@${elem.name}${args}`);
  }

  printBlockElement(blockElement: BlockElement) {
    this.startLine();
    this.printHead(blockElement);
    this.endLine();
    if (typeof blockElement.children === "string") {
      const rawText = blockElement.children as string;
      this.withIndent(() => {
        for (const line of rawText.split("\n")) {
          this.writeLine(line);
        }
      });
    } else {
      this.withIndent(() => {
        this.printBlockItems(blockElement.children as BlockItem[]);
      });
    }
  }

  printInlineElement(inlineElement: InlineElement) {
    this.printHead(inlineElement);
    if (inlineElement.children instanceof String) {
      this.write(inlineElement.children as string);
    } else {
      const inlineItems = inlineElement.children as InlineItem[];
      if (inlineItems.length > 0) {
        this.write("[");
        this.printInlineItems(inlineItems);
        this.write("]");
      }
    }
  }

  printParagraph(paragraph: Paragraph) {
    this.startLine();
    this.printInlineItems(paragraph.children);
    this.endLine();
  }

  printText(text: Text) {
    this.write(text.text);
  }

  printInlineItems(inlineItems: InlineItem[]) {
    for (let i = 0; i < inlineItems.length; i++) {
      const item = inlineItems[i];
      if (item instanceof Text) {
        if (i > 0 && inlineItems[i] instanceof Text) {
          this.write(" ");
        }
        this.printText(item);
      } else if (item instanceof InlineElement) {
        this.printInlineElement(item);
      }
    }
  }

  printBlockItems(blockItems: BlockItem[]) {
    for (let i = 0; i < blockItems.length; i++) {
      const item = blockItems[i];
      if (item instanceof Paragraph) {
        if (i > 0 && blockItems[i - 1] instanceof Paragraph) {
          this.endLine();
        }
        this.printParagraph(item);
      } else if (item instanceof BlockElement) {
        this.printBlockElement(item);
      }
    }
  }
}

export const print = (blockItems: BlockItem[]) => {
  new Printer(process.stdout.write).printBlockItems(blockItems);
};

export const printToString = (blockItems: BlockItem[]): string => {
  let output = "";
  new Printer((s) => (output += s)).printBlockItems(blockItems);
  return output;
};
