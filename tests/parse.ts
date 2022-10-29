import { test } from "uvu";
import * as assert from "uvu/assert";
import * as mr from "../src/markright";
import { strRepr } from "./str-repr";

const lines = (lineArray: string[]): string =>
  lineArray.map((line) => line + "\n").join("");

const parseTest = (input: string[], output: mr.BlockItem[]) => () => {
  const tree = mr.parse(lines(input));
  console.log(strRepr(tree));
  assert.is(
    strRepr(tree),
    strRepr(new mr.RootElement(output)),
    "Trees should be equal"
  );
};

const _Paragraph = (...args) => new mr.Paragraph(...args);
const _Text = (arg) => new mr.Text(arg);

const _I = (
  name: string,
  args: string[] = [],
  isRaw: boolean = false,
  children: mr.InlineItem[] = []
): mr.InlineElement => {
  const result = new mr.InlineElement(name, args, isRaw);
  result.children = children;
  return result;
};

const _B = (
  name: string,
  args: string[] = [],
  isRaw: boolean = false,
  children: mr.BlockItem[]
) => {
  const result = new mr.BlockElement(name, args, isRaw);
  result.children = children;
  return result;
};

// prettier-ignore
test("One paragraph", parseTest(
  [
    "hi ho", 
    "he"
  ], 
  [
    _Paragraph([
      _Text("hi ho"), 
      _Text("he")
    ])
  ]
));

// prettier-ignore
test("Many paragraphs", parseTest(
  [
    "first first first",
    "",
    "second second",
    "second",
    "",
    "",
    "",
    "",
    "third",
    "third third",
  ], 
  [
    _Paragraph([
      _Text("first first first"), 
    ]),
    _Paragraph([
      _Text("second second"), 
      _Text("second"), 
    ]),
    _Paragraph([
      _Text("third"), 
      _Text("third third"), 
    ]),
  ]
));

// prettier-ignore
test("Inline elements", parseTest(
  [
    "@a@b@c",
    "@d",
    "@e  @f",
    "somewhat longer text@g",
    "@h ho  ",
  ],
  [
    _Paragraph([
      _I("a"), _I("b"), _I("c"),
      _I("d"),
      _I("e"), _Text("  "), _I("f"),
      _Text("somewhat longer text"), _I("g"),
      _I("h"), _Text(" ho  "),
    ])
  ]
));

// prettier-ignore
test("Inline items", parseTest(
  [
    "@inline<@a  @b@c @d@e ho@f hi hu>",
  ],
  [
    _Paragraph([
      _I("inline", [], false, [
        _I("a"), _Text("  "), _I("b"), _I("c"), _Text(" "), 
        _I("d"), _I("e"), _Text(" ho"), _I("f"), _Text(" hi hu"),
      ]),
    ])
  ]
));

// prettier-ignore
test("Trim element arguments", parseTest(
  ["@cmd(   a   ,    b  ,, c )"],
  [ 
    _Paragraph([
      _I("cmd", ["a", "b", "", "c"], false)
    ])
  ]
));

// prettier-ignore
test("Element with block subelements", parseTest(
  [
    "@main",
    "  @a @b",
    "  @c",
  ],
  [
    _B("main", [], false, [
      _Paragraph([
        _I("a"), _Text(" "), _I("b"), _I("c")
      ])
    ])
  ]
));

// prettier-ignore
test("Empty lines in subcommand", parseTest(
  [
    "@main",
    "  abc",
    "",
    "  def",
  ],
  [
    _B("main", [], false, [
      _Paragraph([_Text("abc")]),
      _Paragraph([_Text("def")])
    ])
  ]
));

// prettier-ignore
test("Indentation in inner text", parseTest(
  [
    "@command*", 
    "  1st@@b@@c", 
    "    2nd @z", 
    "  @3rd"
  ],
  [
    _B("command", [], true, [
      _Paragraph([_Text("1st@@b@@c\n  2nd @z\n@3rd\n")]),
    ])
  ]
));

// prettier-ignore
test("Different delimiters 1", parseTest(
  ["@a{[]@b[{]}"],
  [
    _Paragraph([
      _I("a", [], false, [
        _Text("[]"),
        _I("b", [], false, [_Text("{")])
      ])
    ])
  ]
));

// prettier-ignore
test("Different delimiters 2", parseTest(
  ["@a<A>@b<<B>>@c<<<C>>>@d<<<<D>>>>"],
  [
    _Paragraph([
      _I("a", [], false, [_Text("A")]),
      _I("b", [], false, [_Text("B")]),
      _I("c", [], false, [_Text("C")]),
      _I("d", [], false, [_Text("D")]),
    ])
  ]
));

// prettier-ignore
test("Different delimiters 3 + no line", parseTest(
  ["@aaa[@bbb<@ccc>]"],
  [
    _Paragraph([
      _I("aaa", [], false, [
        _I("bbb", [], false, [
          _I("ccc")
        ])
      ])
    ])
  ]
));

// prettier-ignore
test("Nested elements", parseTest(
  [
    "@a", 
    "  @b", 
    "    @c"],
  [
    _B("a", [], false, [
      _B("b", [], false, [
        _Paragraph([_I("c")])
      ])
    ])
  ]
));

// prettier-ignore
test("More nested elements", parseTest(
  [
    "@a", 
    "  @b", 
    "    @c",
    "  @d",
    "    @e",
    "      @f",
  ],
  [
    _B("a", [], false, [
      _B("b", [], false, [
        _Paragraph([_I("c")])
      ]),
      _B("d", [], false, [
        _B("e", [], false, [
          _Paragraph([_I("f")])
        ])
      ]),
    ])
  ]
));

// prettier-ignore
test("C++ hello world", parseTest(
  [
    "@code*",
    "  #include<iostream>",
    "  using namespace std;",
    "",
    "  int main() {",
    "    cout << \"hi\" << endl;",
    "  }",
  ],
  [
    _B("code", [], true, [
      _Paragraph([
        _Text(
          lines([
            "#include<iostream>",
            "using namespace std;",
            "",
            "int main() {",
            "  cout << \"hi\" << endl;",
            "}",
          ])
        )
      ]),
    ]),
  ]
))

// prettier-ignore
test("Where empty lines attach 1", parseTest(
  [
    "@first", 
    "  1",
    "",
    "@second",
    "  2",
    ""
  ],
  [
    _B("first", [], false, [
      _Paragraph([_Text("1")])
    ]),
    _B("second", [], false, [
      _Paragraph([_Text("2")])
    ]),
  ]
));

// prettier-ignore
test("Where empty lines attach 2", parseTest(
  [
    "@a", 
    "  1",
    "@b",
    "  2",
    "",
    "@c",
    "  3",
    "",
    "",
    "@d",
    "  4",
  ],
  [
    _B("a", [], false, [
      _Paragraph([_Text("1")])
    ]),
    _B("b", [], false, [
      _Paragraph([_Text("2")])
    ]),
    _B("c", [], false, [
      _Paragraph([_Text("3")])
    ]),
    _B("d", [], false, [
      _Paragraph([_Text("4")])
    ]),
  ]
));

// prettier-ignore
test("Where empty lines attach 3", parseTest(
  [
    "@a", 
    "  1",
    "",
    "",
    "",
    "@b",
    ""
  ],
  [
    _B("a", [], false, [
      _Paragraph([_Text("1")])
    ]),
    _Paragraph([
      _I("b")
    ])
  ]
));

// prettier-ignore
test("Where empty lines attach 4", parseTest(
  [
    "@a", 
    "",
    "",
    "@b",
    ""
  ],
  [
    _Paragraph([
      _I("a")
    ]),
    _Paragraph([
      _I("b")
    ])
  ]
));

// prettier-ignore
test("Nested inline elements", parseTest(
  ["@big[[[@a{{1@b[[2@c@d{@e<3>}]]}}]]]"],
  [
    _Paragraph([
      _I("big", [], false, [
        _I("a", [], false, [
          _Text("1"),
          _I("b", [], false, [
            _Text("2"),
            _I("c"),
            _I("d", [], false, [
              _I("e", [], false, [
                _Text("3")
              ])
            ]),
          ])
        ])
      ])
    ])
  ]
));

// prettier-ignore
test("Numbers and dashes in element", parseTest(
  [
    "@a123@123a", 
    "@--dashes--(1)"
  ],
  [
    _Paragraph([
      _I("a123"), _I("123a"),
      _I("--dashes--", ["1"]),
    ])
  ]
));

test.run();
