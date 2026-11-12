import { awbFindings, maskAwbNumbers } from './awb'
import { dangerousGoodsFindings, handlingFindings } from './glossary'
import { dimensionFindings, pieceFindings, weightFindings } from './quantities'
import { joinLines, normalizeText } from './text'
import type { Finding, FindingCategory, LabelInput } from './types'

/**
 * Turns what was read from a label into plain-language findings. Every finding
 * carries the text it came from; nothing is reported that was not on the label.
 */
export function interpretLabel({ text, barcodes }: LabelInput): Finding[] {
  const lines = normalizeText(text)
  // Phrases such as "THIS WAY" / "UP" can wrap, so they are matched with lines joined.
  const phrases = joinLines(lines)
  // Waybill digits must not be read as a count, weight or size beside them.
  const quantities = maskAwbNumbers(lines)

  const drafts = [
    // The dangerous goods notice comes first so it is not missed.
    ...dangerousGoodsFindings(phrases),
    ...awbFindings(lines, barcodes),
    ...pieceFindings(quantities),
    ...weightFindings(quantities),
    ...dimensionFindings(quantities),
    ...handlingFindings(phrases),
  ]

  const counts = new Map<FindingCategory, number>()
  return drafts.map((draft) => {
    const index = counts.get(draft.category) ?? 0
    counts.set(draft.category, index + 1)
    return { ...draft, id: `${draft.category}-${index}` }
  })
}
