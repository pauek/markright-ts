
export const assert = (expr: boolean, msg: string) => {
  if (!expr) {
    throw new Error(`assert failed: ${msg}`)
  }
}

export const splitLines = (str: string) => {
  let lines = str.split('\n')
  if (str[str.length-1] === '\n') {
    lines = lines.slice(0, lines.length-1)
  }
  return lines
}

export const allSpaces = (line: string) => line === ' '.repeat(line.length)
export const emptyLine = (line: string) => line === '' || allSpaces(line)
export const indentation = (line: string) => (emptyLine(line) ? 0 : line.split('').findIndex(c => c !== ' '))

