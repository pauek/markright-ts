import { Text, Paragraph, InlineItem, InlineElement, BlockElement, BlockItem } from "./model";

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
const isRawElement = (name: string) => name[name.length - 1] === "*";

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
  if (firstNonSpace % 2 == 1) {
    throw new Error("Indentation has to be a multiple of 2!");
  }
  return {
    text: line.slice(firstNonSpace),
    indent: firstNonSpace / 2,
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
    throw new Error(`Expected '${closeDelim}' before line end`);
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
        const children = isRawElement(name) ? body : this.parseLine(body);
        items.push(new InlineElement(name, args, children));
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

  parseRawBlock(baseIndent: number, name: string, args: string[] | null = null): BlockElement {
    const element = new BlockElement(name, args, "");
    while (this.curr < this.lines.length) {
      const line = this.lines[this.curr];
      if (isEmptyLine(line)) {
        element.children += "\n";
        this.curr++;
        continue;
      }
      if (line.indent < baseIndent) {
        break;
      }
      if (line.indent > baseIndent) {
        line.text = "  ".repeat(line.indent - baseIndent) + line.text;
      }
      element.children += `${line.text}\n`;
      this.curr++;
    }
    return element;
  }

  parseBlock(baseIndent: number, name: string, args: string[] | null = null): BlockElement {
    const element = new BlockElement(name, args, []);
    const children: BlockItem[] = element.children as BlockItem[];
    let paragraph: Paragraph | null = null;

    while (this.curr < this.lines.length) {
      const line = this.lines[this.curr];
      const nextLine = this.curr + 1 < this.lines.length ? this.lines[this.curr + 1] : null;

      if (isEmptyLine(line)) {
        if (paragraph !== null) {
          children.push(paragraph);
          paragraph = null;
        }
        this.curr++;
        continue;
      }

      // A line with lower indent -> finished
      if (line.indent < baseIndent) {
        break;
      }

      const atElement = line.text[0] === elementStartChar;
      const atBlockElement = atElement && nextLine && nextLine.indent > line.indent;

      if (atBlockElement) {
        assert(nextLine.indent === line.indent + 1, "Illegal indent increment!");
        const { name, args } = parseElementHead(line.text);
        this.curr++;
        if (isRawElement(name)) {
          children.push(this.parseRawBlock(line.indent + 1, name, args));
        } else {
          children.push(this.parseBlock(line.indent + 1, name, args));
        }
      } else {
        // Text or InlineElement
        paragraph ??= new Paragraph([]);
        paragraph.children.push(...this.parseLine(line.text));
        this.curr++;
      }
    }
    if (paragraph !== null) {
      children.push(paragraph);
    }
    return element;
  }
}

export const parse = (text: string): BlockElement => {
  const parser = new Parser(text);
  return parser.parseBlock(0, "<root>", null);
};
