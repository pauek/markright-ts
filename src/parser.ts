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

interface Symbol {
  name: string;
  isRaw: boolean;
}
const parseSymbol = (name: string): Symbol => {
  const isRaw = name.slice(-1) === "*";
  const cleanName = isRaw ? name.slice(0, -1) : name;
  return { isRaw, name: cleanName };
};

const matchDelim = (delim: string): string => closeDelimiters[openDelimiters.indexOf(delim)];

// Parser

interface Line {
  text: string;
  indent: number;
}

const detectLineIndent = (line: string): Line => {
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
  return text.slice(0, limit).split("\n").map(detectLineIndent);
};

// TODO: Implementar el hecho de que los argumentos ocupen mucho más de una línea!!
interface ElementHead {
  name: string;
  args: string[];
  end: number;
}
const parseElementHead = (text: string, from: number = 0): ElementHead => {
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

  const parseArgs = (): string[] => {
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
  return { name, args, end: i };
};

interface ElementBody {
  text: string;
  delim?: string;
  end: number;
}
const parseElementBody = (line: string, from: number): ElementBody => {
  let i = from;
  const openCh = line[i];
  if (!isOpenDelim(openCh)) {
    return { text: "", end: i };
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
    text: line.slice(start, end),
    delim: openDelim,
    end: i,
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
        const head = parseElementHead(line, i);
        const body = parseElementBody(line, head.end);
        const sym = parseSymbol(head.name);

        const inlineElement = new InlineElement(sym.name, head.args, sym.isRaw);
        inlineElement.children = sym.isRaw ? body.text : this.parseLine(body.text);
        items.push(inlineElement);

        i = body.end;
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

  parseBlockRawText(baseIndent: number, name: string, args: string[] = null): string {
    let result: string = "";
    let pendingEndl: boolean = false;
    while (this.curr < this.lines.length) {
      const line = this.lines[this.curr];
      if (isEmptyLine(line)) {
        if (pendingEndl) {
          result += "\n";
        }
        pendingEndl = true;
        this.curr++;
        continue;
      }
      if (line.indent < baseIndent) {
        break;
      }
      if (pendingEndl) {
        result += "\n";
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
    let paragraph: Paragraph = null;

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
        const { name: origName, args } = parseElementHead(line.text);
        this.curr++;
        const sym = parseSymbol(origName);
        if (sym.isRaw) {
          const blockRawElement = new BlockElement(sym.name, args, true);
          blockRawElement.children = this.parseBlockRawText(line.indent + 2, sym.name, args);
          children.push(blockRawElement);
        } else {
          const blockElement = new BlockElement(sym.name, args);
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
