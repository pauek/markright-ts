import * as mr from "./src/markright";

const tree = mr.parse(`
@document
  @title
    The Tales of Markrightbury
@person
  @title
    The Duchess
`);

const docTitle = tree.query(["document", "title"]);
console.dir(docTitle);