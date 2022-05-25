import { readdir, readFile } from "fs/promises";
import { parse } from "../src/markright";
import { BlockElement, BlockItem } from "../src/model";

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    throw new Error(msg);
  }
};

interface Test {
  title: string;
  type: string;
  input: BlockItem[] | string;
  output: BlockItem[] | string;
}

const isTestName = (name: string) => {
  const parts = name.split("-");
  return parts.length === 2 && parts[1] === "test";
};

const testType = (name: string) => name.split("-")[0];

const validateTest = (item: BlockItem): Test => {
  assert(item instanceof BlockElement, "A test should be a Block Element");
  const test = item as BlockElement;
  assert(isTestName(test.name), `Name does not end in '-test' (${test.name})`);
  assert(
    test.args !== null && typeof test.args![0] === "string",
    `Test should have a title as argument`
  );
  assert(!(typeof test.children === "string"), "Tests should not be raw elements");
  assert(test.children !== null, "A test should have children!");
  assert(test.children!.length === 2, "A test should have just 2 children");
  assert(
    test.children![0] instanceof BlockElement && test.children![1] instanceof BlockElement,
    "Test inputs and outputs should be block elements"
  );
  const input = test.children![0] as BlockElement;
  const output = test.children![1] as BlockElement;
  assert(input.name === "input", `First element should be named 'input' (${input.name})`);
  assert(output.name === "output", `Second element should be named 'output' (${output.name})`);
  assert(!(input.children instanceof String), "Input children should not be a string");
  assert(
    typeof output.children === "string",
    `Output children should be a string (${typeof output.children})`
  );
  return {
    title: test.args![0],
    type: testType(test.name),
    input: input.children!,
    output: output.children!,
  };
};

interface TestResult {
  pass: boolean;
  title: string;
  actual?: string;
  expected?: string;
}

const performParseTest = (title: string, input: string, output: string): TestResult => {
  const fromInput = parse(input)
    .map((elem) => elem.toString("") + "\n").join("");
  if (fromInput === output) {
    return { title, pass: true };
  } else {
    return { title, pass: false, actual: fromInput, expected: output };
  }
};

const performTest = (test: Test): TestResult => {
  switch (test.type) {
    case "parse": {
      assert(typeof test.input === "string", "Input should be raw in a parse test");
      assert(typeof test.output === "string", "Output should be raw in a parse test");
      return performParseTest(test.title, test.input as string, test.output as string);
    }
    default:
      return { title: test.title, pass: false };
  }
};

const processTestFile = async (file: string): Promise<TestResult[]> => {
  const buffer = await readFile(`./test/tests/${file}`);
  const testSuite = parse(buffer.toString());
  const results: TestResult[] = [];
  for (const test of testSuite) {
    const result = performTest(validateTest(test));
    process.stdout.write(result.pass ? "." : "x");
    results.push(result);
  }
  return results;
};

const reportResults = (results: TestResult[]) => {
  for (const result of results) {
    if (!result.pass) {
      process.stdout.write(`${result.title}\n`);
      process.stdout.write(`Actual: #\n${result.actual}#\n`);
      process.stdout.write(`Expected: #\n${result.expected}#\n`);
    }
  }
};

const allTests = async () => {
  const files = await readdir("./test/tests");
  const results: TestResult[] = [];
  for (const file of files) {
    if (!file.startsWith("_")) {
      process.stdout.write(`${file}: `);
      results.push(...(await processTestFile(file)));
      process.stdout.write(`\n`);
    }
  }
  reportResults(results);
};

allTests();
