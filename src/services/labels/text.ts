/**
 * Prepares OCR output for pattern matching: upper case, single spaces,
 * look-alike punctuation replaced with plain ASCII. Line breaks are kept,
 * because a number and its unit belong together only when they share a line.
 */
export function normalizeText(input: string): string {
  return input
    .toUpperCase()
    .replace(/[×✕✖]/g, 'X')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[“”″]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n[ \n]*/g, '\n')
    .trim()
}

/** Joins wrapped lines, for phrases such as "THIS WAY" / "UP" that a label splits. */
export function joinLines(text: string): string {
  return text.replace(/\n/g, ' ')
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

/** Reads a number printed with either a decimal point or a decimal comma. */
export function parsePrintedNumber(value: string): number {
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(value)) {
    return Number(value.replace(/,/g, ''))
  }
  return Number(value.replace(',', '.'))
}
