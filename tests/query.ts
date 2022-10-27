import { test } from "uvu";
import * as assert from "uvu/assert";
import * as mr from "../src/markright";

const simpleQueryText = `
@document
  @title
    The Tales of Markrightbury
@person
  @title
    The Duchess
`;
test("Simple query", () => {
  const tree = mr.parse(simpleQueryText);
  const docTitle = tree.query("document title") as mr.BlockElement;
  const personTitle = tree.query("person title") as mr.BlockElement;
  assert.is(docTitle, (tree.children[0] as mr.BlockElement).children[0]);
  assert.is(personTitle, (tree.children[1] as mr.BlockElement).children[0]);
  assert.is(docTitle.innerText, "The Tales of Markrightbury");
});

const innerTextText = `
@root
  This @em{text} has some @elements{in @b[it]} @br
`;
test("innerText", () => {
  const tree = mr.parse(innerTextText);
  const root = tree.query("root") as mr.BlockElement;
  assert.equal(root.innerText, "This text has some in it ");
});

const queryAll1Text = `
@document
  @title
    First title
@document
  @title
    Second title
@title
  Third title
`;
test("Query All 1", () => {
  const tree = mr.parse(queryAll1Text);
  
  const allTitles = tree.queryAll("title");
  assert.is(allTitles.length, 3);
  if (allTitles.length === 3) {
    const [t1, t2, t3] = allTitles;
    assert.is(t1.innerText, "First title");
    assert.is(t2.innerText, "Second title");
    assert.is(t3.innerText, "Third title");
  }

  const allDocTitles = tree.queryAll("document title");
  assert.is(allDocTitles.length, 2);
  if (allDocTitles.length === 2) {
    const [t1, t2] = allDocTitles;
    assert.is(t1.innerText, "First title");
    assert.is(t2.innerText, "Second title");
  }

  const allParagraphs = tree.queryAll("<Paragraph>");
  assert.is(allParagraphs.length, 3);
  if (allParagraphs.length === 3) {
    const [p1, p2, p3] = allParagraphs;
    assert.is(p1.innerText, "First title");
    assert.is(p2.innerText, "Second title");
    assert.is(p3.innerText, "Third title");
  }
});

test.run();
