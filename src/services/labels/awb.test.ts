import { describe, expect, it } from 'vitest'
import {
  awbFindings,
  awbFromBarcode,
  awbsFromText,
  maskAwbNumbers,
} from './awb'

describe('awbsFromText', () => {
  it.each(['016-1234 5675', '016 12345675', '01612345675', '016-12345675'])(
    'reads %s',
    (printed) => {
      const [awb] = awbsFromText(`AWB ${printed}`)
      expect(awb).toMatchObject({
        display: '016-12345675',
        valid: true,
        checkDigit: 5,
        airline: 'United Airlines',
      })
    },
  )

  it('uses the first seven serial digits modulo 7 as the check digit', () => {
    const [awb] = awbsFromText('016-12345671')
    expect(awb).toMatchObject({
      valid: false,
      checkDigit: 1,
      expectedCheckDigit: 5,
    })
  })

  it('keeps a failing number only when something says it is a waybill', () => {
    expect(awbsFromText('ORDER 555 12345671')).toEqual([])
    expect(awbsFromText('AWB 555 12345671')).toHaveLength(1)
    expect(awbsFromText('016 12345671')).toHaveLength(1)
  })

  it('ignores digits that are part of a longer number', () => {
    expect(awbsFromText('0161234567501')).toEqual([])
  })

  it('does not join digits from separate lines', () => {
    expect(awbsFromText('016\n12345675')).toEqual([])
  })

  it('reports an unknown prefix as unknown rather than guessing', () => {
    const [awb] = awbsFromText('555-12345675')
    expect(awb).toMatchObject({ valid: true, airline: undefined })
  })
})

describe('awbFromBarcode', () => {
  it('accepts a barcode that is exactly a valid waybill number', () => {
    expect(awbFromBarcode('01612345675')?.display).toBe('016-12345675')
    expect(awbFromBarcode(' 016-12345675 ')?.display).toBe('016-12345675')
  })

  it('leaves everything else as a raw barcode', () => {
    expect(awbFromBarcode('01612345671')).toBeNull()
    expect(awbFromBarcode('ABC01612345675')).toBeNull()
    expect(awbFromBarcode('0161234567')).toBeNull()
  })
})

describe('awbFindings', () => {
  it('merges the same number found in a barcode and in the text', () => {
    const findings = awbFindings('AWB 016-12345675', [
      { format: 'Code 128', text: '01612345675' },
    ])
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      title: 'Air waybill 016-12345675',
      tone: 'ok',
      sources: ['barcode', 'text'],
    })
  })

  it('warns when the check digit fails in the text', () => {
    const [finding] = awbFindings('AWB 016-12345671', [])
    expect(finding).toMatchObject({ tone: 'caution', sources: ['text'] })
    expect(finding?.detail).toContain('5 was expected')
  })
})

describe('maskAwbNumbers', () => {
  it('removes waybill-shaped numbers', () => {
    expect(maskAwbNumbers('AWB 016-1234 5675 PCS 3')).toBe('AWB [AWB] PCS 3')
  })
})
