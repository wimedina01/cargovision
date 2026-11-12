import { describe, expect, it } from 'vitest'
import { dangerousGoodsFindings, handlingFindings } from './glossary'

describe('handlingFindings', () => {
  it('explains common handling marks in plain language', () => {
    const findings = handlingFindings(
      'FRAGILE - THIS SIDE UP - DO NOT STACK - KEEP DRY - NO HOOKS',
    )
    expect(findings.map((finding) => finding.title)).toEqual([
      'Fragile',
      'Keep upright',
      'Do not stack',
      'Keep dry',
      'No hooks',
    ])
    expect(findings[0]?.detail).toMatch(/break|damaged/)
  })

  it('does not invent a temperature range for cold-chain marks', () => {
    const [finding] = handlingFindings('KEEP COOL')
    expect(finding?.detail).not.toMatch(/\d/)
    expect(finding?.detail).toContain('printed on the label')
  })

  it('matches phrases that wrap onto the next line once lines are joined', () => {
    expect(handlingFindings('THIS WAY UP')).toHaveLength(1)
  })

  it.each(['NON-FRAGILE', 'NOT PERISHABLE', 'NO LIVE ANIMALS'])(
    'ignores the negated "%s"',
    (printed) => {
      expect(handlingFindings(printed)).toEqual([])
    },
  )

  it('treats live animals and human remains as needing attention', () => {
    expect(handlingFindings('LIVE ANIMALS')[0]?.tone).toBe('caution')
    expect(handlingFindings('HUMAN REMAINS')[0]?.tone).toBe('caution')
  })
})

describe('dangerousGoodsFindings', () => {
  it('lists the wording it found without interpreting it', () => {
    const [finding, ...rest] = dangerousGoodsFindings(
      'LITHIUM ION BATTERIES UN 3481 CARGO AIRCRAFT ONLY',
    )
    expect(rest).toEqual([])
    expect(finding).toMatchObject({
      category: 'dangerous-goods',
      tone: 'caution',
      raw: 'LITHIUM, UN3481, CARGO AIRCRAFT ONLY',
    })
    expect(finding?.detail).toContain('does not interpret')
  })

  it('still flags a "non-hazardous" claim, showing it as printed', () => {
    expect(dangerousGoodsFindings('NON-HAZARDOUS')[0]?.raw).toBe(
      'NON-HAZARDOUS',
    )
  })

  it('stays quiet for ordinary text', () => {
    expect(dangerousGoodsFindings('PERISHABLE 3 PCS RUN1234 UN 12')).toEqual([])
  })
})
