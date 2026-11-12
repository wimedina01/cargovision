import type { DraftFinding, FindingTone } from './types'

interface HandlingTerm {
  label: string
  pattern: RegExp
  meaning: string
  tone?: FindingTone
}

// Stops "NON-FRAGILE", "NOT PERISHABLE" or "NO LIVE ANIMALS" being read as the term itself.
const NOT_NEGATED = String.raw`(?<!\b(?:NO|NOT|NON)[ -])`

// Plain-language meanings of common handling marks. Only wording that is
// widely understood is listed, and no temperatures or procedures are invented.
const handlingTerms: readonly HandlingTerm[] = [
  {
    label: 'Fragile',
    pattern: new RegExp(String.raw`${NOT_NEGATED}\bFRAGILE\b`),
    meaning: 'The contents can break or be damaged easily. Handle gently.',
  },
  {
    label: 'Keep upright',
    pattern:
      /\b(?:THIS (?:WAY|SIDE|END) UP|KEEP UPRIGHT|STORE UPRIGHT|UPRIGHT ONLY|DO NOT (?:TIP|TILT))\b/,
    meaning: 'Keep the package the right way up. Do not tip it onto its side.',
  },
  {
    label: 'Do not stack',
    pattern: /\b(?:DO NOT STACK|NO STACKING|NON[- ]?STACKABLE|NOT STACKABLE)\b/,
    meaning: 'Do not stack other cargo on top of this package.',
  },
  {
    label: 'Handle with care',
    pattern: /\b(?:HANDLE WITH CARE|HANDLE CAREFULLY|DO NOT (?:DROP|THROW))\b/,
    meaning: 'Handle gently. Do not drop or throw the package.',
  },
  {
    label: 'Keep dry',
    pattern:
      /\b(?:KEEP DRY|DO NOT GET WET|(?:KEEP AWAY FROM|PROTECT FROM) (?:WATER|MOISTURE|RAIN))\b/,
    meaning: 'Protect the package from water, rain and moisture.',
  },
  {
    label: 'Keep cool',
    pattern:
      /\b(?:KEEP (?:COOL|COLD|REFRIGERATED)|STORE (?:COOL|COLD|REFRIGERATED)|REFRIGERATE)\b/,
    meaning:
      'Keep the package cool or refrigerated. Use the temperature range printed on the label or in the shipment documents.',
  },
  {
    label: 'Keep frozen',
    pattern: /\b(?:KEEP (?:DEEP )?FROZEN|STORE FROZEN|DEEP[- ]FROZEN)\b/,
    meaning:
      'Keep the package frozen. Use the temperature range printed on the label or in the shipment documents.',
  },
  {
    label: 'Do not freeze',
    pattern: /\b(?:DO NOT FREEZE|PROTECT FROM FREEZING|KEEP FROM FREEZING)\b/,
    meaning: 'Protect the package from freezing temperatures.',
  },
  {
    label: 'Keep away from heat',
    pattern:
      /\b(?:(?:KEEP (?:AWAY )?FROM|PROTECT FROM) (?:HEAT|SUN(?:LIGHT)?|DIRECT SUN(?:LIGHT)?)|KEEP OUT OF (?:DIRECT )?SUN(?:LIGHT)?)\b/,
    meaning: 'Protect the package from heat and direct sunlight.',
  },
  {
    label: 'Perishable',
    pattern: new RegExp(String.raw`${NOT_NEGATED}\bPERISHABLES?\b`),
    meaning:
      'The contents can spoil. Check the shipment documents for how long, and at what temperature, it can be held.',
  },
  {
    label: 'Live animals',
    pattern: new RegExp(String.raw`${NOT_NEGATED}\bLIVE ANIMALS?\b`),
    meaning:
      'Live animals are being shipped and need special care. Follow your company procedures for live animals.',
    tone: 'caution',
  },
  {
    label: 'Human remains',
    pattern: new RegExp(String.raw`${NOT_NEGATED}\bHUMAN REMAINS\b`),
    meaning:
      'Human remains are being shipped. Follow your company procedures for human remains.',
    tone: 'caution',
  },
  {
    label: 'No hooks',
    pattern: /\b(?:USE NO HOOKS|NO HOOKS?|DO NOT USE HOOKS)\b/,
    meaning: 'Do not use hooks on this package.',
  },
]

export function handlingFindings(text: string): DraftFinding[] {
  const findings: DraftFinding[] = []
  for (const term of handlingTerms) {
    const match = term.pattern.exec(text)
    if (!match) continue
    findings.push({
      category: 'handling',
      title: term.label,
      detail: term.meaning,
      tone: term.tone ?? 'info',
      sources: ['text'],
      raw: match[0],
    })
  }
  return findings
}

// Wording that can mean dangerous goods. A leading "NON-" or "NOT " is kept in
// the match but does not stop the notice: missing a real hazard is worse than
// showing an unneeded notice.
const DANGEROUS_GOODS =
  /(?:\b(?:NON|NOT)[ -])?(?:\b(?:DANGEROUS GOODS|HAZARDOUS|HAZMAT|FLAMMABLE|CORROSIVE|EXPLOSIVES?|RADIOACTIVE|BIOHAZARD|TOXIC|POISON(?:OUS)?|OXIDI[SZ]ER|LITHIUM|CARGO AIRCRAFT ONLY|MAGNETI[SZ]ED|DRY ICE)\b|\bUN ?\d{4}\b)/g

/**
 * Dangerous goods are deliberately not interpreted. When the text contains
 * wording that can mean dangerous goods, a single neutral notice lists it.
 */
export function dangerousGoodsFindings(text: string): DraftFinding[] {
  const terms: string[] = []
  for (const match of text.matchAll(DANGEROUS_GOODS)) {
    const term = match[0].replace(/^UN /, 'UN')
    if (!terms.includes(term)) terms.push(term)
  }
  if (terms.length === 0) return []

  const raw = terms.join(', ')
  return [
    {
      category: 'dangerous-goods',
      title: 'Dangerous goods wording found',
      detail: `The text includes: ${raw}. CargoVision does not interpret dangerous goods marks or labels. Follow your company dangerous goods procedures.`,
      tone: 'caution',
      sources: ['text'],
      raw,
    },
  ]
}
