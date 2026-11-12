import type { ReadResult } from 'zxing-wasm/reader'
import { describe, expect, it, vi } from 'vitest'

vi.mock('zxing-wasm/reader', () => {
  const labels: Record<string, string> = {
    Code128: 'Code 128',
    QRCode: 'QR Code',
  }
  return {
    prepareZXingModule: vi.fn(() => Promise.resolve({})),
    readBarcodes: vi.fn(() => Promise.resolve([])),
    formatToLabel: vi.fn((format: string) => labels[format]),
  }
})

vi.mock('zxing-wasm/reader/zxing_reader.wasm?url', () => ({
  default: '/assets/zxing_reader.wasm',
}))

function decoded(format: string, text: string, isValid = true): ReadResult {
  return { format, text, isValid } as unknown as ReadResult
}

// The module caches its loaded reader, so each test starts from a fresh copy.
// The mocked library is shared between tests, so its functions are put back
// to their defaults as well.
async function load() {
  vi.resetModules()
  const zxing = await import('zxing-wasm/reader')
  vi.mocked(zxing.prepareZXingModule).mockReset()
  vi.mocked(zxing.readBarcodes).mockReset()
  const { readBarcodes } = await import('./barcodes')
  return { zxing, readBarcodes }
}

describe('readBarcodes', () => {
  it('returns decoded codes with readable format names', async () => {
    const { zxing, readBarcodes } = await load()
    vi.mocked(zxing.readBarcodes).mockResolvedValue([
      decoded('Code128', '01612345675'),
      decoded('QRCode', 'https://example.com'),
      decoded('Aztec', 'ABC'),
    ])

    await expect(readBarcodes(new Blob(['image']))).resolves.toEqual([
      { format: 'Code 128', text: '01612345675' },
      { format: 'QR Code', text: 'https://example.com' },
      { format: 'Aztec', text: 'ABC' },
    ])
  })

  it('drops invalid, empty and duplicate results', async () => {
    const { zxing, readBarcodes } = await load()
    vi.mocked(zxing.readBarcodes).mockResolvedValue([
      decoded('Code128', '01612345675'),
      decoded('Code128', '01612345675'),
      decoded('Code128', '99999999999', false),
      decoded('None', ''),
      decoded('Code128', ''),
    ])

    await expect(readBarcodes(new Blob(['image']))).resolves.toEqual([
      { format: 'Code 128', text: '01612345675' },
    ])
  })

  it('loads the WebAssembly from the app instead of a CDN, once', async () => {
    const { zxing, readBarcodes } = await load()

    await readBarcodes(new Blob(['one']))
    await readBarcodes(new Blob(['two']))

    expect(zxing.prepareZXingModule).toHaveBeenCalledTimes(1)
    const options = vi.mocked(zxing.prepareZXingModule).mock.calls[0]?.[0]
    // The emscripten typings the library relies on are not installed here.
    const overrides = options?.overrides as
      { locateFile?: (path: string, prefix: string) => string } | undefined
    const locateFile = overrides?.locateFile
    if (!locateFile) throw new Error('No locateFile override was provided')

    expect(locateFile('zxing_reader.wasm', 'https://cdn.example/')).toBe(
      '/assets/zxing_reader.wasm',
    )
    expect(locateFile('other.bin', 'https://cdn.example/')).toBe(
      'https://cdn.example/other.bin',
    )
  })

  it('tries loading again after a failed attempt', async () => {
    const { zxing, readBarcodes } = await load()
    vi.mocked(zxing.prepareZXingModule).mockRejectedValueOnce(
      new Error('not available'),
    )

    await expect(readBarcodes(new Blob(['image']))).rejects.toThrow(
      'not available',
    )
    await expect(readBarcodes(new Blob(['image']))).resolves.toEqual([])
    expect(zxing.prepareZXingModule).toHaveBeenCalledTimes(2)
  })
})
