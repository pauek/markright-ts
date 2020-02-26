
const colors = require('colors')
const fs = require('fs')
import { parseRecur, parse, Item, Text, Block, Line, BlockCommand, InlineCommand } from '../src/markright'

const write = (str: string) => process.stdout.write(str)

const print = (x: Item | string): string => {
  switch (x.constructor) {
    case String:
      return (x as string)
    case Text:
      return `${(x as Text).text}`
    case Block: {
      const block: Block = (x as Block);
      return `Block(${block.children && block.children.map(print).join('')})`
    }
    case Line:
      const line: Line = (x as Line);
      return `Line(${line.children ? line.children.map(print).join('') : ''})`
    case BlockCommand: {
      const cmd: BlockCommand = (x as BlockCommand);
      let result = `@${cmd.name}`
      if (cmd.args) result += `(${cmd.args.join(',')})`
      if (cmd.children) {
        result += `:${print(cmd.children)}`
      }
      return result
    }
    case InlineCommand: {
      const cmd: InlineCommand = (x as InlineCommand);
      let result = `@${cmd.name}`
      if (cmd.args) result += `(${cmd.args.join(',')})`
      if (cmd.children && cmd.delim) {
        result += `${cmd.delim.open}${print(cmd.children)}${cmd.delim.close}`
      }
      return result
    }
    default:
      throw new Error(`Unexpected object of type -- ${x.constructor}`)
  }
}

const report = (title: string, input: string, fn: Function) => {
  try {
    const { actual, expected } = fn()
    if (actual !== expected) {
      write('x')
      return [
        `Test "${title}" failed:\n${colors.yellow(input)}`,
        `${colors.green(`"${expected}"`)}`,
        `${colors.red(`"${actual}"`)}`,
        ``,
      ]
    } else {
      write('.')
    }
  } catch (e) {
    write('x')
    return [`Test "${title}" failed with exception:`, e.stack, ``]
  }
}

const parseTest = (input: string, output: string) => ({
  actual: print(parseRecur(input, {})),
  expected: output,
})

const jsonTest = (input: string, output: string) => ({
  actual: parseRecur(input, {}).toJson(),
  expected: output,
})

const testParser = (testFunc: Function, errors: string[]) => ({ args, rawChildren }: { args: string[], rawChildren: string }) => {
  const testName = (args && args[0]) || ''
  let input: string = '', output: string = '';
  parse(rawChildren, {
    'input': ({ rawChildren }: { rawChildren: string }) => input = rawChildren,
    'output': ({ rawChildren }: { rawChildren: string }) => output = rawChildren,
  })
  if (!input || !output) {
    throw new Error(`Error in test "${testName}": Input or output is empty!`)
  }
  // If the output has a last '\n' we should remove it
  if (output[output.length - 1] === '\n') {
    output = output.slice(0, output.length - 1)
  }
  const errs = report(testName, input, () => testFunc(input, output))
  if (errs) {
    errors.push(...errs)
    throw new Error(`Some test failed`)
  }
}

const runTest = (testfile: string) => {
  let errors: string[] = []
  try {
    const fileContent = fs.readFileSync(testfile).toString()
    parse(fileContent, {
      'parse-test': testParser(parseTest, errors),
      'json-test': testParser(jsonTest, errors),
    })
  } catch (e) {
    console.error(e)
    write('\n')
    if (errors.length > 0) {
      write(`\n${errors.join('\n')}\n`)
    }
    process.exit(1)
  }
}

// Process all files ending in '.mr' in the 'test' directory
fs.readdir('./test/tests', (err: any, files: string[]) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  const testfiles = files.filter(f => f.endsWith('.mr'))
  const maxLength = testfiles.reduce((mx, f) => Math.max(mx, f.length), 0)
  testfiles.forEach((testfile) => {
    write(`${testfile}${' '.repeat(maxLength + 1 - testfile.length)}`)
    runTest(`./test/tests/${testfile}`)
    write(`\n`)
  })
})

