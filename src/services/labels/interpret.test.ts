import { describe, expect, it } from 'vitest'
import { interpretLabel } from './interpret'
import { normalizeText, parsePrintedNumber } from './text'

const LABEL = `AWB 016-1234 5675
PCS 3  WT 248.0 KGS
DIM: 48 X 40 X 36 IN
FRAGILE
THIS SIDE
UP
UN3481`

describe('interpretLabel', () => {
  it('explains a whole label, dangerous goods notice first', () => {
    const findings = interpretLabel({ text: LABEL, barcodes: [] })
    expect(findings.map((finding) => finding.id)).toEqual([
      'dangerous-goods-0',
      'awb-0',
      'pieces-0',
      'weight-0',
      'dimensions-0',
      'handling-0',
      'handling-1',
    ])
    expect(findings.map((finding) => finding.title)).toEqual([
      'Dangerous goods wording found',
      'Air waybill 016-12345675',
      '3 pieces',
      'Weight 248 kg',
      'Dimensions 48 × 40 × 36 in',
      'Fragile',
      'Keep upright',
    ])
  })

  it('does not read the end of the waybill number as a piece count', () => {
    const sameLine = interpretLabel({
      text: 'AWB 016-1234 5675 PCS 3',
      barcodes: [],
    })
    const nextLine = interpretLabel({
      text: 'AWB 016-1234 5675\nPCS 3\n248 KG',
      barcodes: [],
    })
    expect(sameLine.map((finding) => finding.title)).toEqual([
      'Air waybill 016-12345675',
      '3 pieces',
    ])
    expect(nextLine.map((finding) => finding.title)).toEqual([
      'Air waybill 016-12345675',
      '3 pieces',
      'Weight 248 kg',
    ])
  })

  it('finds a waybill from a barcode alone', () => {
    const findings = interpretLabel({
      text: '',
      barcodes: [{ format: 'Code 128', text: '016-12345675' }],
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      id: 'awb-0',
      sources: ['barcode'],
    })
  })

  it('reports nothing for text with nothing recognisable', () => {
    expect(
      interpretLabel({ text: 'Deliver to dock 4 before noon', barcodes: [] }),
    ).toEqual([])
  })

  it('does not treat other barcodes as waybills', () => {
    const findings = interpretLabel({
      text: '',
      barcodes: [
        { format: 'QR Code', text: 'https://example.com/12345678901' },
      ],
    })
    expect(findings).toEqual([])
  })
})

describe('normalizeText', () => {
  it('upper-cases, tidies punctuation and keeps line breaks', () => {
    expect(normalizeText('  48 × 40 – 36 in \r\n\r\n  Fragile ')).toBe(
      '48 X 40 - 36 IN\nFRAGILE',
    )
  })
})

describe('parsePrintedNumber', () => {
  it.each([
    ['1,250', 1250],
    ['1,250.5', 1250.5],
    ['12,5', 12.5],
    ['248.0', 248],
  ])('reads %s', (printed, value) => {
    expect(parsePrintedNumber(printed)).toBe(value)
  })
})
