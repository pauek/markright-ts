import { Item, Text, Block, Line, BlockCommand, InlineCommand } from './model'
import { splitLines } from './utils'

export const stringify = (mr: Item) => {
  let indent: number = 0
  let line: string = ''
  let result: string = ''

  const add = (x: string) => line += x
  const newLine = () => {
    result += line + '\n'
    line = ' '.repeat(indent * 2)
  }

  const _stringify = (x: null | undefined | Item) => {
    if (x === null || x === undefined) {
      return '';
    }
    switch (x.constructor) {
      case Text: {
        const t : Text = x as Text;
        if (t.text === '@') add('@@')
        else add(t.text)
        break
      }
      case Block: {
        const b : Block = x as Block;
        if (b.children) {
          b.children.forEach(item => {
            newLine()
            _stringify(item)
          })
        }
        break
      }
      case Line: {
        const ln : Line = x as Line;
        if (ln.children) ln.children.map(_stringify)
        break
      }
      case BlockCommand: {
        const cmd : BlockCommand = x as BlockCommand;
        const { name, args, rawChildren, children } = cmd
        add(`@${name}`)
        if (args) add(`(${args.join(',')})`)
        indent++
        if (rawChildren) {
          splitLines(rawChildren).forEach(line => {
            newLine()
            add(line)
          })
        } else {
          _stringify(children)
        }
        indent--
        break
      }
      case InlineCommand: {
        const cmd : InlineCommand = x as InlineCommand;
        const { name, args, delim, rawChildren, children } = cmd
        add(`@${name}`)
        if (args) add(`(${args.join(',')})`)
        if (delim) {
          add(delim.open)
          if (rawChildren) {
            add(rawChildren)
          } else {
            _stringify(children)
          }
          add(delim.close)
        }
        break
      }
      default:
        throw new Error(`stringify of an unknown type! (obj = ${JSON.stringify(x)})`)
    }
  }

  _stringify(mr)
  if (line) {
    result += line + '\n'
  }
  return result
}
