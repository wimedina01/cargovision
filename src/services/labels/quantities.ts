import type { LengthUnit } from '../units'
import { LB_PER_KG, convertLength } from '../units'
import { formatNumber, parsePrintedNumber } from './text'
import type { DraftFinding } from './types'

interface Located {
  start: number
  finding: DraftFinding
}

function inReadingOrder(found: Located[]): DraftFinding[] {
  return found.sort((a, b) => a.start - b.start).map((item) => item.finding)
}

const PIECE_WORD = String.raw`(?:PIECES?|PCS?|PKGS?|PACKAGES?)`

// A number and its word or unit must share a line (a single space between
// them), while a caption may sit on the line above its value ("PIECES" / "3").

// "PIECE 2 OF 5", "PC 2/5", "PKG NO. 2 OF 5". Text readers often turn the
// letter O into a zero, so "PIECE 20F5" is read as 2 of 5 too.
const PIECE_POSITION = new RegExp(
  String.raw`\b(?:PIECE|PC|PKG|PACKAGE)S?\.?\s*[:=#]?\s*(?:NO\.? ?)?(\d{1,4}) ?(?:[O0]F|/) ?(\d{1,4})\b(?![/.-]\d)`,
  'g',
)
// "2 OF 5 PIECES"
const POSITION_BEFORE_WORD = new RegExp(
  String.raw`(?<![.,/-])\b(\d{1,4}) ?OF ?(\d{1,4}) ?${PIECE_WORD}\b`,
  'g',
)
// "3 PCS", "3 PIECES", "3 PKG"
const COUNT_BEFORE_WORD = new RegExp(
  String.raw`(?<![.,/-])\b(\d{1,4}) ?${PIECE_WORD}\b`,
  'g',
)
// "PCS 3", "PIECES: 3". Skipped when the number is really a weight, a size,
// a position ("3 OF 5") or part of a date.
const COUNT_AFTER_WORD = new RegExp(
  String.raw`\b${PIECE_WORD}\b\.?\s*[:#=]?\s*(\d{1,4})\b(?! ?(?:KGS?|LBS?|IN\b|CM\b|MM\b|X\b|OF\b|/|\.\d))`,
  'g',
)

function positionFinding(
  position: number,
  total: number,
  raw: string,
): DraftFinding {
  const consistent = position >= 1 && position <= total
  return {
    category: 'pieces',
    title: `Piece ${position} of ${total}`,
    detail: consistent
      ? `This label is for piece ${position} out of ${total} in the shipment.`
      : 'The numbers do not add up, so the text may have been misread. Compare it with the label.',
    tone: consistent ? 'info' : 'caution',
    sources: ['text'],
    raw,
  }
}

function countFinding(count: number, raw: string): DraftFinding {
  return {
    category: 'pieces',
    title: `${count} ${count === 1 ? 'piece' : 'pieces'}`,
    detail:
      'Piece count as printed. Compare it with the shipment paperwork and the pieces in front of you.',
    tone: 'info',
    sources: ['text'],
    raw,
  }
}

export function pieceFindings(text: string): DraftFinding[] {
  const claimed: Array<readonly [start: number, end: number]> = []
  const seen = new Set<string>()
  const found: Located[] = []

  // Several patterns can match the same words, so each stretch of text is
  // used once, in the order the patterns are tried.
  const claim = (match: RegExpExecArray): boolean => {
    const start = match.index
    const end = start + match[0].length
    if (claimed.some(([from, to]) => start < to && end > from)) return false
    claimed.push([start, end])
    return true
  }
  const keep = (key: string, start: number, finding: DraftFinding) => {
    if (seen.has(key)) return
    seen.add(key)
    found.push({ start, finding })
  }

  for (const pattern of [PIECE_POSITION, POSITION_BEFORE_WORD]) {
    for (const match of text.matchAll(pattern)) {
      if (!claim(match)) continue
      const position = Number(match[1])
      const total = Number(match[2])
      keep(
        `${position}/${total}`,
        match.index,
        positionFinding(position, total, match[0]),
      )
    }
  }
  for (const pattern of [COUNT_BEFORE_WORD, COUNT_AFTER_WORD]) {
    for (const match of text.matchAll(pattern)) {
      if (!claim(match)) continue
      const count = Number(match[1])
      if (count < 1) continue
      keep(`count:${count}`, match.index, countFinding(count, match[0]))
    }
  }
  return inReadingOrder(found)
}

const WEIGHT =
  /(?<![\d.,])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?) ?(KGS?|KILOS?|KILOGRAMS?|LBS?|POUNDS?)\b/g

export function weightFindings(text: string): DraftFinding[] {
  const seen = new Set<string>()
  const findings: DraftFinding[] = []
  for (const match of text.matchAll(WEIGHT)) {
    const [raw, amount, word] = match
    if (amount === undefined || word === undefined) continue
    const value = parsePrintedNumber(amount)
    if (!(value > 0)) continue

    const metric = word.startsWith('K')
    const key = `${word.slice(0, 1)}:${value}`
    if (seen.has(key)) continue
    seen.add(key)

    const converted = metric ? value * LB_PER_KG : value / LB_PER_KG
    findings.push({
      category: 'weight',
      title: `Weight ${formatNumber(value)} ${metric ? 'kg' : 'lb'}`,
      detail: `About ${formatNumber(converted)} ${metric ? 'lb' : 'kg'}. Check whether this is the weight per piece or the total for the shipment.`,
      tone: 'info',
      sources: ['text'],
      raw,
    })
  }
  return findings
}

const NUMBER = String.raw`(\d{1,4}(?:[.,]\d{1,2})?)`
const UNIT = String.raw`(?: ?(IN(?:CH(?:ES)?)?\b|CMS?\b|MM\b|"))?`
const NOT_MORE_DIGITS = String.raw`(?![.,]?\d)`

// "48 X 40 X 36 IN", "48X40X36", "120 X 100 X 90 CM"
const DIMENSIONS_WITH_X = new RegExp(
  String.raw`(?<![\d.,])${NUMBER}${UNIT} ?X ?${NUMBER}${UNIT} ?X ?${NUMBER}${UNIT}${NOT_MORE_DIGITS}`,
  'g',
)
// "DIM: 48/40/36". The slash form needs the word, since a/b/c is also a date.
const DIMENSIONS_WITH_SLASH = new RegExp(
  String.raw`\b(?:DIMS?|DIMENSIONS?|SIZE)\b\.?\s*[:=]?\s*${NUMBER}${UNIT} ?/ ?${NUMBER}${UNIT} ?/ ?${NUMBER}${UNIT}${NOT_MORE_DIGITS}`,
  'g',
)

function canonicalUnit(printed: string): LengthUnit {
  if (printed === '"' || printed.startsWith('IN')) return 'in'
  return printed.startsWith('CM') ? 'cm' : 'mm'
}

function dimensionFinding(match: RegExpExecArray): DraftFinding | null {
  const [raw, first, unitOfFirst, second, unitOfSecond, third, unitOfThird] =
    match
  if (first === undefined || second === undefined || third === undefined) {
    return null
  }
  const sizes = [first, second, third].map(parsePrintedNumber)
  if (sizes.some((size) => !(size > 0))) return null

  const units = new Set<LengthUnit>()
  for (const printed of [unitOfFirst, unitOfSecond, unitOfThird]) {
    if (printed !== undefined) units.add(canonicalUnit(printed))
  }

  const printedSizes = sizes.map(formatNumber).join(' × ')
  const order =
    'Shown in the order printed. The label does not say which is length, width or height.'
  const base = {
    category: 'dimensions',
    sources: ['text'],
    raw: raw.trim(),
  } as const

  if (units.size > 1) {
    return {
      ...base,
      title: `Dimensions ${printedSizes}`,
      detail:
        'The units on the label do not agree, so the text may have been misread. Compare it with the label.',
      tone: 'caution',
    }
  }
  const unit = [...units][0]
  if (unit === undefined) {
    return {
      ...base,
      title: `Dimensions ${printedSizes}`,
      detail: `No unit is printed with these numbers. ${order}`,
      tone: 'info',
    }
  }
  const other: LengthUnit = unit === 'in' ? 'cm' : 'in'
  const converted = sizes
    .map((size) => formatNumber(convertLength(size, unit, other)))
    .join(' × ')
  return {
    ...base,
    title: `Dimensions ${printedSizes} ${unit}`,
    detail: `About ${converted} ${other}. ${order}`,
    tone: 'info',
  }
}

export function dimensionFindings(text: string): DraftFinding[] {
  const seen = new Set<string>()
  const found: Located[] = []
  for (const pattern of [DIMENSIONS_WITH_X, DIMENSIONS_WITH_SLASH]) {
    for (const match of text.matchAll(pattern)) {
      const finding = dimensionFinding(match)
      if (!finding || seen.has(finding.title)) continue
      seen.add(finding.title)
      found.push({ start: match.index, finding })
    }
  }
  return inReadingOrder(found)
}
