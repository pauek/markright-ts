import chalk from "chalk";
import { readdir, readFile } from "fs/promises";
import {
  parse,
  walk,
  BlockElement,
  BlockItem,
  symBlockChildren,
  symBlockElement,
  symInlineChildren,
  symInlineElement,
  symParagraph,
  symText,
} from "../internal/index.js";

const passChar = "·";
const failChar = "X";

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    throw new Error(msg);
  }
};

interface TestBase {
  type: string;
  title: string;
}

interface WalkTest extends TestBase {
  type: "walk";
  funcMap: string;
  input: BlockItem[];
  output: string;
}
interface ParseTest extends TestBase {
  type: "parse";
  title: string;
  input: string;
  output: string;
}

type Test = WalkTest | ParseTest;

const isTestName = (name: string) => {
  const parts = name.split("-");
  return parts.length === 2 && parts[1] === "test";
};

const testType = (name: string) => name.split("-")[0];

const validateParseTest = (parseTest: BlockElement): ParseTest => {
  const [inputItem, outputItem] = parseTest.findByName("input", "output");
  assert(inputItem !== null, `There should be an element named 'input'`);
  assert(outputItem !== null, `There should be an element named 'output'`);
  assert(inputItem instanceof BlockElement, `Input should be a BlockElement`);
  assert(outputItem instanceof BlockElement, `Output should be a BlockElement`);
  const input = inputItem as BlockElement;
  const output = outputItem as BlockElement;
  assert(input.isRaw, "Input should be raw");
  assert(output.isRaw, `Output should be raw`);
  return {
    type: "parse",
    title: parseTest.args![0],
    input: input.children as string,
    output: output.children as string,
  };
};

const validateWalkTest = (walkTest: BlockElement): WalkTest => {
  const [funcMapItem, inputItem, outputItem] = walkTest.findByName("funcMap", "input", "output");
  assert(funcMapItem !== null, `There should be an element named 'funcMap'`);
  assert(inputItem !== null, `There should be an element named 'input'`);
  assert(outputItem !== null, `There should be an element named 'output'`);
  assert(funcMapItem instanceof BlockElement, `funcMap should be a BlockElement`);
  assert(inputItem instanceof BlockElement, `inputItem should be a BlockElement`);
  assert(outputItem instanceof BlockElement, `outputItem should be a BlockElement`);
  const funcMap = funcMapItem as BlockElement;
  const input = inputItem as BlockElement;
  const output = outputItem as BlockElement;
  assert(funcMap.isRaw, `FuncMap should be raw`);
  assert(!input.isRaw, `Input should not be raw`);
  assert(output.isRaw, `Output should be raw`);
  return {
    type: "walk",
    title: walkTest.args![0],
    funcMap: funcMap.children as string,
    input: input.children as BlockItem[],
    output: output.children as string,
  };
};

const validateTestElement = (item: BlockItem): BlockElement => {
  assert(item instanceof BlockElement, "A test should be a Block Element");
  const elem = item as BlockElement;
  assert(isTestName(elem.name), `Name does not end in '-test' (${elem.name})`);
  assert(
    elem.args !== null && typeof elem.args![0] === "string",
    `Test should have a title as argument`
  );
  assert(!(typeof elem.children === "string"), "Tests should not be raw elements");
  assert(elem.children !== null, "A test should have children!");
  return elem;
};

const validateTest = (item: BlockItem): Test | null => {
  const elem = validateTestElement(item);
  switch (testType(elem.name)) {
    case "parse":
      return validateParseTest(elem);
    case "walk":
      return validateWalkTest(elem);
    default:
      return null;
  }
};

interface TestResultBase {
  type: string;
  pass: boolean;
  title: string;
}

interface TestResultOK extends TestResultBase {
  type: "ok";
  pass: true;
}
interface TestResultDifference extends TestResultBase {
  type: "diff";
  actual?: string;
  expected?: string;
}

interface TestResultError extends TestResultBase {
  type: "error";
  error?: string;
}

type TestResult = TestResultOK | TestResultError | TestResultDifference;

const performParseTest = (test: ParseTest): TestResult => {
  const fromInput = parse(test.input)
    .map((elem) => elem.toString("") + "\n")
    .join("");
  if (fromInput === test.output) {
    return { type: "ok", title: test.title, pass: true };
  } else {
    return {
      type: "diff",
      title: test.title,
      pass: false,
      actual: fromInput,
      expected: test.output,
    };
  }
};

const performWalkTest = (test: WalkTest): TestResult => {
  const funcMap = eval(`(
    (blockChildren, inlineChildren, blockElement, inlineElement, text, paragraph) => ({
      ${test.funcMap.split("\n").join("")}
    })
  )`);
  let result: any = walk(
    test.input,
    funcMap(
      symBlockChildren,
      symInlineChildren,
      symBlockElement,
      symInlineElement,
      symText,
      symParagraph
    )
  );
  if (Array.isArray(result)) {
    result = result.join("\n") + "\n";
  }
  if (typeof result !== "string") {
    return {
      type: "error",
      title: test.title,
      pass: false,
      error: `Result is not a string (${typeof result})!`,
    };
  }
  if (result === test.output) {
    return { type: "ok", title: test.title, pass: true };
  }
  return { type: "diff", title: test.title, pass: false, actual: result, expected: test.output };
};

const performTest = (test: Test): TestResult => {
  switch (test.type) {
    case "parse": {
      return performParseTest(test);
    }
    case "walk": {
      return performWalkTest(test);
    }
  }
};

const processTestFile = async (file: string): Promise<TestResult[]> => {
  const buffer = await readFile(`./test/tests/${file}`);
  const testSuite = parse(buffer.toString());
  const results: TestResult[] = [];
  for (const item of testSuite) {
    let result: TestResult | null = null;
    try {
      const test = validateTest(item);
      if (test) {
        result = performTest(test);
      } else {
        if (item instanceof BlockElement) {
          console.warn(`Warning: ignoring ${item.name}.`);
        } else {
          console.warn(`Warning: ignoring paragraph`);
        }
      }
    } catch (e: any) {
      result = {
        title: "<unknown>",
        type: "error",
        pass: false,
        error: `Exception: ${e.toString()}`,
      };
    }
    if (result) {
      results.push(result);
    }
  }
  return results;
};

const maxLength = (lines: string[]) => lines.reduce((ac, x) => Math.max(ac, x.length), 0);

const padRight = (lines: string[], len: number): string[] =>
  lines.map((line) => line.padEnd(len, " "));

const highlightDifferences = (maxLen: number, actual: string, expected: string) => {
  let actualDiff: string = "",
    expectedDiff: string = "";
  for (let i = 0; i < maxLen; i++) {
    const equal = actual[i] === expected[i];
    if (i < actual.length) {
      actualDiff += equal ? actual[i] : chalk.bgYellow.black(actual[i]);
    } else {
      actualDiff += " ";
    }
    if (i < expected.length) {
      expectedDiff += equal ? expected[i] : chalk.bgYellow.black(expected[i]);
    } else {
      expectedDiff += " ";
    }
  }
  return actualDiff + expectedDiff + "\n";
};

const compareOutputs = (actual: string, expected: string) => {
  const actualLines = actual.split("\n");
  const expectedLines = expected.split("\n");
  const maxLen = Math.max(maxLength(actualLines), maxLength(expectedLines)) + 3;
  const paddedActualLines = padRight(actualLines, maxLen);

  process.stdout.write(chalk.red("Actual:".padEnd(maxLen, " ") + chalk.green("Expected:") + "\n"));
  for (let i = 0; i < Math.max(paddedActualLines.length, expectedLines.length); i++) {
    const actual = actualLines[i];
    const expected = expectedLines[i];
    let line = `${paddedActualLines[i]}${expected}\n`;
    if (actual && expected) {
      if (actual !== expected) {
        process.stdout.write(highlightDifferences(maxLen, `${actual}`, `${expected}`));
      } else {
        process.stdout.write(chalk.dim(line));
      }
    } else if (actual) {
      process.stdout.write(chalk.dim(actual));
    } else if (expected) {
      process.stdout.write(" ".repeat(maxLen) + expected);
    }
  }
};

const reportResults = (file: string, testResults: TestResult[]) => {
  process.stdout.write(`${file}: `);
  for (const res of testResults) {
    process.stdout.write(res.pass ? chalk.green(passChar) : chalk.bold.red(failChar));
  }
  process.stdout.write("\n");
  const failedTestResults = testResults.filter((test) => !test.pass);
  if (failedTestResults.length > 0) {
    process.stdout.write("\n");
  }
  for (let i = 0; i < failedTestResults.length; i++) {
    const res = failedTestResults[i];
    process.stdout.write(chalk.bold.yellow(`${res.title}\n`));
    if (res.type === "error") {
      console.log(`Failed to execute: ${res.error}`);
    } else if (res.type === "diff") {
      console.log(res);
      compareOutputs(res.actual!, res.expected!);
    }
    process.stdout.write("\n");
  }
};

const allTests = async () => {
  const files = await readdir("./test/tests");
  for (const file of files) {
    if (!file.startsWith("_")) {
      const results = await processTestFile(file);
      reportResults(file, results);
    }
  }
};

allTests();
