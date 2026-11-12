import { describe, expect, it } from 'vitest'
import { dimensionFindings, pieceFindings, weightFindings } from './quantities'

const titles = (findings: Array<{ title: string }>) =>
  findings.map((finding) => finding.title)

describe('pieceFindings', () => {
  it.each([
    ['3 PCS', '3 pieces'],
    ['PCS 3', '3 pieces'],
    ['3 PIECES', '3 pieces'],
    ['PIECES: 3', '3 pieces'],
    ['3 PKG', '3 pieces'],
    ['1 PIECE', '1 piece'],
    ['PIECES\n3', '3 pieces'],
    ['PIECE 2 OF 5', 'Piece 2 of 5'],
    ['PIECE2OF5', 'Piece 2 of 5'],
    ['PIECE20F5', 'Piece 2 of 5'],
    ['PC 2/5', 'Piece 2 of 5'],
    ['2 OF 5 PIECES', 'Piece 2 of 5'],
  ])('reads "%s"', (printed, title) => {
    expect(titles(pieceFindings(printed))).toEqual([title])
  })

  it('marks a position past the total as a possible misread', () => {
    const [finding] = pieceFindings('PIECE 6 OF 5')
    expect(finding).toMatchObject({ tone: 'caution', title: 'Piece 6 of 5' })
  })

  it.each([
    'PCS 45 KG',
    'PCS 12/05/2024',
    'PCS 2.5',
    '2.5 PCS',
    'ITEM 3 OF 5',
    '0 PCS',
    'WEIGHT 40\nPCS',
  ])('does not read a piece count from "%s"', (printed) => {
    expect(pieceFindings(printed)).toEqual([])
  })

  it('does not take a number from the end of the previous line', () => {
    expect(titles(pieceFindings('REF 2024\nPCS 3'))).toEqual(['3 pieces'])
  })

  it('counts a repeated figure once', () => {
    expect(titles(pieceFindings('3 PCS ... PCS: 3'))).toEqual(['3 pieces'])
  })
})

describe('weightFindings', () => {
  it('reads kilograms and shows pounds', () => {
    const [finding] = weightFindings('GROSS WT: 248.0 KGS')
    expect(finding).toMatchObject({ title: 'Weight 248 kg', raw: '248.0 KGS' })
    expect(finding?.detail).toContain('About 546.7 lb')
  })

  it('reads pounds with a thousands separator and shows kilograms', () => {
    const [finding] = weightFindings('1,250 LBS')
    expect(finding?.title).toBe('Weight 1,250 lb')
    expect(finding?.detail).toContain('About 567 kg')
  })

  it('reads a decimal comma and does not drop the integer part', () => {
    expect(titles(weightFindings('12,5 KG'))).toEqual(['Weight 12.5 kg'])
    expect(titles(weightFindings('2.5 KG'))).toEqual(['Weight 2.5 kg'])
  })

  it('lists a repeated weight once and skips zero or a missing unit', () => {
    expect(titles(weightFindings('45 KG 45 KG 0 KG 99'))).toEqual([
      'Weight 45 kg',
    ])
  })

  it('needs the number and unit on the same line', () => {
    expect(weightFindings('5675\nKG 248')).toEqual([])
  })
})

describe('dimensionFindings', () => {
  it('reads sizes with a unit and converts them', () => {
    const [finding] = dimensionFindings('48 X 40 X 36 IN')
    expect(finding).toMatchObject({
      title: 'Dimensions 48 × 40 × 36 in',
      raw: '48 X 40 X 36 IN',
    })
    expect(finding?.detail).toContain('About 121.9 × 101.6 × 91.4 cm')
  })

  it('reads centimetres, millimetres and the slash form', () => {
    expect(titles(dimensionFindings('120 X 100 X 90 CM'))).toEqual([
      'Dimensions 120 × 100 × 90 cm',
    ])
    expect(titles(dimensionFindings('DIM: 48/40/36 IN'))).toEqual([
      'Dimensions 48 × 40 × 36 in',
    ])
    expect(dimensionFindings('240X180X120MM')[0]?.detail).toContain(
      'About 9.4 × 7.1 × 4.7 in',
    )
  })

  it('says when no unit is printed instead of assuming one', () => {
    const [finding] = dimensionFindings('48X40X36')
    expect(finding?.title).toBe('Dimensions 48 × 40 × 36')
    expect(finding?.detail).toContain('No unit is printed')
  })

  it('flags units that disagree', () => {
    const [finding] = dimensionFindings('48 IN X 40 CM X 36 IN')
    expect(finding?.tone).toBe('caution')
  })

  it.each(['10 X 20', '12/05/2024', 'SIZE 10/20', '48 X 40 X 36.555'])(
    'does not read "%s" as a size',
    (printed) => {
      expect(dimensionFindings(printed)).toEqual([])
    },
  )
})
