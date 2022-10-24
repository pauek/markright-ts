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
`)
  // const title = mr.query(tree, 'title');
  // assert.is(typeof title, "BlockElement");
});