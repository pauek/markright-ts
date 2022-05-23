import { readFileSync } from 'fs';
import markright from '../dist/markright';

const text = readFileSync("object.mr").toString();

const object = ({ rawChildren }) => {
  let result = {};
  markright.parse(rawChildren, {
    __command__: cmd => {
      const { name, args, rawChildren } = cmd;
      const type = args && args[0];
      if (type === null || type === undefined) {
        if (cmd instanceof markright.BlockCommand) {
          if (rawChildren) {
            result[name] = object({ rawChildren });
          } else {
            result[name] = true;
          }
        } else if (rawChildren === undefined) {
          result[name] = true; // an inline command without anything counts as a boolean
        } else {
          result[name] = rawChildren;
        }
         
      } else {
        switch (type) {
          case "double":
          case "int":
            result[name] = Number(rawChildren);
            break;
          case "string":
            result[name] = rawChildren;
            break;
          case "bool":
            result[name] = rawChildren === "true";
            break;
          default:
            throw new Error(`object: unknown object type -> '${type}' <-`);
        }
      }
    }
  });
  return result;
};

const [person] = markright.parse(text, {
  person: object,
  __block__: ({ children }) =>
    children.filter(item => !(item instanceof markright.Line))
});

console.log(person);
