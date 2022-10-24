import { test } from "uvu";
import * as assert from "uvu/assert";
import * as mr from "../src/markright";

test("Simple query", () => {
  const tree = mr.parse(`
@document
  @title
    The Tales of Markrightbury
@person
  @title
    The Duchess
`);
  const docTitle = tree.query("document title");
  const personTitle = tree.query("person title");
  assert.is(docTitle, (tree.children[0] as mr.BlockElement).children[0]);
  assert.is(personTitle, (tree.children[1] as mr.BlockElement).children[0]);
});

test.run();
