import { test } from "uvu";
import * as assert from "uvu/assert";
import * as mr from "../src/markright";

const lines = (lineArray: string[]): string =>
  lineArray.map((line) => line + "\n").join("");

test("Walk a text", () => {
  const tree = mr.parse(`hi`);
  const result = mr.walk(tree, {
    [mr.symText]: ({ text }) => text.toUpperCase(),
  });
  assert.is(result[0], "HI", "Text should be uppercase");
});

test("Double asterisk 1", () => {
  const tree = mr.parse(`hola     @elm{que}    tal`);
  const result = mr.walk(tree, {
    ["elm"]: ({ children }) => `**${children as string}**`,
  });
  assert.is(result[0], "hola **que** tal");
});

test("Double asterisk 2", () => {
  const tree = mr.parse(`
@elm
  some content
@elm
  some other content
`);
  const result = mr.walk(tree, {
    ["elm"]: ({ children }) => `**${children as string}**`,
  });
  assert.is(
    result.map((item) => item + "\n").join(""),
    lines(["**some content**", "**some other content**"])
  );
});

const doubleAsteriskText = `
some paragraph
in more
than one line
`;
test("Double asterisk 2", () => {
  const tree = mr.parse(doubleAsteriskText);
  const result = mr.walk(tree, {
    [mr.symParagraph]: ({ children }) => children.join("<br>\n"),
  });
  assert.is(
    result[0],
    "some paragraph<br>\n" + "in more<br>\n" + "than one line",
    "Lines should be joined by <br>"
  );
});

test("Arguments", () => {
  const tree = mr.parse(`@a(1, 2){content}`);
  const result = mr.walk(tree, {
    ["a"]: ({ args, children }) => `a(${args.join(", ")})[${children}]`,
  });
  assert.is(result[0], "a(1, 2)[content]");
});

test("Inline element", () => {
  const tree = mr.parse(`@elem{hi, there}`);
  const result = mr.walk(tree, {
    ["elem"]: ({ children }) => `[[${children}]]`,
  });
  assert.is(result[0], "[[hi, there]]");
});

test("Object", () => {
  const tree = mr.parse(`
@result
  @obj
    @name{James}
    @age{27}
  @obj
    @name{John}
    @age{13}
  `);

  const join = (children: mr.Item[] | string): string => {
    if (typeof children === "string") {
      return children;
    } else {
      return children.map((item) => item.toString()).join("");
    }
  };

  const result = mr.walk(tree, {
    [mr.symParagraph]: ({ children }) => children /* avoid join */,
    ["name"]: ({ children }) => ({ name: join(children) }),
    ["age"]: ({ children }) => ({ age: Number(join(children)) }),
    ["obj"]: ({ children }) => Object.assign({}, ...(children as any)[0]),
    ["result"]: ({ children }) => children,
  });

  assert.is(
    JSON.stringify(result[0]),
    JSON.stringify([
      { name: "James", age: 27 },
      { name: "John", age: 13 },
    ])
  );
});

const htmlText = `
@html
  @head
    @style*
      body { margin: 0; }
  @body
    @main
      @section
        @h1{A classical page}
        @p
          Some paragraph
          with more than one line
`;
const htmlResult = `<html>
<head>
<style>
body { margin: 0; }

</style>
</head>
<body>
<main>
<section>
<h1>A classical page</h1>
<p>
Some paragraph with more than one line
</p>
</section>
</main>
</body>
</html>`;

test("HTML 1", () => {
  const tree = mr.parse(htmlText);
  const html = mr.walk(tree, mr.htmlFuncMap);
  assert.is(html[0], htmlResult);
});

test.run();
