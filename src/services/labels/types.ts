export type FindingCategory =
  'awb' | 'pieces' | 'weight' | 'dimensions' | 'handling' | 'dangerous-goods'

export const categoryLabels: Record<FindingCategory, string> = {
  awb: 'Air waybill',
  pieces: 'Pieces',
  weight: 'Weight',
  dimensions: 'Dimensions',
  handling: 'Handling',
  'dangerous-goods': 'Dangerous goods',
}

export type FindingTone = 'ok' | 'info' | 'caution'

export type FindingSource = 'barcode' | 'text'

/** One thing found on a label, with a plain-language explanation. */
export interface Finding {
  id: string
  category: FindingCategory
  title: string
  detail: string
  tone: FindingTone
  sources: readonly FindingSource[]
  /** The text exactly as it was matched, so the user can compare it with the label. */
  raw: string
}

export type DraftFinding = Omit<Finding, 'id'>

export interface ScannedBarcode {
  /** Human-readable symbology name, for example "Code 128". */
  format: string
  text: string
}

export interface LabelInput {
  /** Text read from the label photo. */
  text: string
  barcodes: readonly ScannedBarcode[]
}
