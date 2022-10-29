import {
  BlockElement,
  Container,
  Element,
  InlineElement,
  Item,
  Paragraph,
  RootElement,
  Text,
} from "../src/model";

export const strRepr = (tree: RootElement) => {
  const headerRepr = (item: Element<Item>) => {
    const hasArgs = Array.isArray(item.args) && item.args.length > 0;
    const args = hasArgs ? `(${item.args.join(", ")})` : ``;
    return `${item.name}${args}`;
  };

  const childrenRepr = (item: Container<Item>) =>
    item.children.map(repr).join(", ");

  const repr = (item: Item) => {
    if (item instanceof Text) {
      return `Text("${item.text}")`;
    } else if (item instanceof Paragraph) {
      return `Paragraph(${childrenRepr(item)})`;
    } else if (item instanceof RootElement) {
      return `RootElement(${childrenRepr(item)})`;
    } else if (item instanceof BlockElement) {
      const header = headerRepr(item);
      return `Block/${header}[${childrenRepr(item)})`;
    } else if (item instanceof InlineElement) {
      const header = headerRepr(item);
      return `Inline/${header}[${childrenRepr(item)})`;
    }
  };

  return childrenRepr(tree);
};
