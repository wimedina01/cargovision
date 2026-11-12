export type LengthUnit = 'in' | 'cm' | 'mm'

export const MM_PER_UNIT: Readonly<Record<LengthUnit, number>> = {
  in: 25.4,
  cm: 10,
  mm: 1,
}

export const LB_PER_KG = 2.20462262185

export function convertLength(
  value: number,
  from: LengthUnit,
  to: LengthUnit,
): number {
  return (value * MM_PER_UNIT[from]) / MM_PER_UNIT[to]
}
