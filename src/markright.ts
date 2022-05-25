import { Text, Paragraph, InlineItem, InlineElement, BlockElement, BlockItem } from "./model";
import Printer from "./printer";

const elementStartChar = "@";
const openDelimiters = "[{(<";
const closeDelimiters = "]})>";
const allDelimiters = `${elementStartChar} ${openDelimiters}${closeDelimiters}`;

const assert = (expr: boolean, msg: string) => {
  if (!expr) {
    throw new Error(`Assert Failed: ${msg}`);
  }
};

const isEmptyLine = (line: Line) => line.text === "" && line.indent === 0;
const isAllSpaces = (line: string) => line === " ".repeat(line.length);
const isDelimiter = (ch: string) => allDelimiters.indexOf(ch) !== -1;
const isOpenDelim = (ch: string) => openDelimiters.indexOf(ch) !== -1;

const isRawElement = (name: string) => {
  if (name[name.length - 1] === "*") {
    return { isRaw: true, cleanName: name.slice(0, -1) };
  } else {
    return { isRaw: false, cleanName: name };
  }
}

const matchDelim = (delim: string): string => closeDelimiters[openDelimiters.indexOf(delim)];

// Parser

interface Line {
  text: string;
  indent: number;
}

const parseLine = (line: string): Line => {
  if (isAllSpaces(line)) {
    return { text: "", indent: 0 };
  }
  let firstNonSpace: number = 0;
  while (firstNonSpace < line.length && line[firstNonSpace] === " ") {
    firstNonSpace++;
  }
  return {
    text: line.slice(firstNonSpace),
    indent: firstNonSpace,
  };
};

const splitLines = (text: string): Line[] => {
  let lastChar = text[text.length - 1];
  let limit = text.length + (lastChar === "\n" ? -1 : 0);
  return text.slice(0, limit).split("\n").map(parseLine);
};

interface ParseElementResult {
  name: string;
  args: string[] | null;
  pos: number;
}

// FIXME: Implementar el hecho de que los argumentos ocupen mucho más de una línea!!
const parseElementHead = (text: string, from: number = 0): ParseElementResult => {
  assert(text[from] === "@", "Expected @");

  let i: number = from + 1;

  const parseName = () => {
    let name = "";
    while (i < text.length && !isDelimiter(text[i])) {
      name += text[i];
      i++;
    }
    return name;
  };

  const parseArgs = (): string[] | null => {
    if (text[i] !== "(") {
      return null;
    }
    i++;
    let args = [];
    let curr = "";
    while (i < text.length) {
      if (text[i] === ")") {
        args.push(curr.trim());
        i++;
        break;
      } else if (text[i] === ",") {
        args.push(curr.trim());
        curr = "";
      } else {
        curr += text[i];
      }
      i++;
    }
    return args;
  };
  const name = parseName();
  const args = parseArgs();
  return { name, args, pos: i };
};

const parseElementBody = (
  line: string,
  from: number
): { body: string; delim?: string; pos: number } => {
  let i = from;
  const openCh = line[i];
  if (!isOpenDelim(openCh)) {
    return { body: "", pos: i };
  }
  let width = 0;
  while (line[i] === openCh) {
    width++, i++;
  }
  const start = i;
  const openDelim = openCh.repeat(width);
  const closeDelim = matchDelim(openCh).repeat(width);
  let end = line.indexOf(closeDelim, start);
  if (end === -1) {
    throw new Error(`Expected '${closeDelim}' at line "${line}"`);
  }
  i = end + width;
  return {
    body: line.slice(start, end),
    delim: openDelim,
    pos: i,
  };
};

class Parser {
  lines: Line[];
  curr: number;

  constructor(text: string) {
    this.lines = splitLines(text);
    this.curr = 0;
  }

  // FIXME: Naïve con el rollo de los delimitadores!!!
  // Estamos como en C con el /* /* */ */!!!
  parseLine(line: string): InlineItem[] {
    let items: InlineItem[] = [];
    let text: Text = new Text("");
    let i: number = 0;
    while (i < line.length) {
      if (line[i] === "@") {
        if (text && text.text.length > 0) {
          items.push(text);
          text = new Text("");
        }
        const { name, args, pos: i2 } = parseElementHead(line, i);
        const { body, pos: i3 } = parseElementBody(line, i2);
        const { cleanName, isRaw } = isRawElement(name);

        const inlineElement = new InlineElement(cleanName, args, isRaw);
        inlineElement.children = isRaw ? body : this.parseLine(body);
        items.push(inlineElement);

        i = i3;
      } else {
        text.text += line[i];
        i++;
      }
    }
    if (text.text.length > 0) {
      items.push(text);
    }
    return items;
  }

  parseBlockRawText(baseIndent: number, name: string, args: string[] | null = null): string {
    let result: string = "";
    let pendingEndl: boolean = false;
    while (this.curr < this.lines.length) {
      const line = this.lines[this.curr];
      if (isEmptyLine(line)) {
        if (pendingEndl) {
          result += '\n';
        }
        pendingEndl = true;
        this.curr++;
        continue;
      }
      if (line.indent < baseIndent) {
        break;
      }
      if (pendingEndl) {
        result += '\n';
        pendingEndl = false;
      }
      if (line.indent > baseIndent) {
        line.text = " ".repeat(line.indent - baseIndent) + line.text;
      }
      result += `${line.text}\n`;
      this.curr++;
    }
    return result;
  }

  parseBlockItems(baseIndent: number): BlockItem[] {
    const children: BlockItem[] = [];
    let paragraph: Paragraph | null = null;

    const maybeEndParagraph = () => {
      if (paragraph) {
        children.push(paragraph);
        paragraph = null;
      }
    };

    while (this.curr < this.lines.length) {
      const line = this.lines[this.curr];
      const nextLine = this.curr + 1 < this.lines.length ? this.lines[this.curr + 1] : null;

      if (isEmptyLine(line)) {
        maybeEndParagraph();
        this.curr++;
        continue;
      }

      // A line with lower indent -> finished
      if (line.indent < baseIndent) {
        break;
      }

      const atElement = line.text[0] === elementStartChar && line.indent == baseIndent;
      const atBlockElement = atElement && nextLine && nextLine.indent > line.indent;

      if (atBlockElement) {
        maybeEndParagraph();
        const { name, args } = parseElementHead(line.text);
        this.curr++;
        const { isRaw, cleanName } = isRawElement(name);
        if (isRaw) {
          const blockRawElement = new BlockElement(cleanName, args, true);
          blockRawElement.children = this.parseBlockRawText(line.indent + 2, cleanName, args);
          children.push(blockRawElement);
        } else {
          const blockElement = new BlockElement(cleanName, args);
          blockElement.children = this.parseBlockItems(line.indent + 2);
          children.push(blockElement);
        }
      } else {
        // Text or InlineElement
        paragraph ??= new Paragraph([]);
        paragraph.children.push(...this.parseLine(line.text));
        this.curr++;
      }
    }
    maybeEndParagraph();
    return children;
  }
}

export const parse = (text: string): BlockItem[] => {
  return new Parser(text).parseBlockItems(0);
};

export const print = (blockItems: BlockItem[]) => {
  new Printer(process.stdout.write).printBlockItems(blockItems);
};

export const printStr = (blockItems: BlockItem[]): string => {
  let output = "";
  new Printer((s) => (output += s)).printBlockItems(blockItems);
  return output;
};
