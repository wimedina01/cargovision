import type * as ZXing from 'zxing-wasm/reader'
import type { ScannedBarcode } from '../labels/types'

type ZXingReader = typeof ZXing

/** A label sheet rarely carries more than a few codes. */
const MAX_BARCODES = 10

let reader: Promise<ZXingReader> | undefined

async function loadReader(): Promise<ZXingReader> {
  const [module, wasm] = await Promise.all([
    import('zxing-wasm/reader'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])

  await module.prepareZXingModule({
    // The library fetches its WebAssembly from a CDN by default, which cannot
    // work offline. Point it at the copy bundled with the app instead.
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? wasm.default : prefix + path,
    },
    fireImmediately: true,
  })

  return module
}

function readyReader(): Promise<ZXingReader> {
  if (!reader) {
    const attempt: Promise<ZXingReader> = loadReader().catch(
      (error: unknown) => {
        // Let the next call try again rather than caching the failure.
        if (reader === attempt) reader = undefined
        throw error
      },
    )
    reader = attempt
  }
  return reader
}

/**
 * Finds and decodes every barcode in a photo. The text is returned exactly as
 * printed in the barcode, without interpretation.
 */
export async function readBarcodes(image: Blob): Promise<ScannedBarcode[]> {
  const zxing = await readyReader()
  const results = await zxing.readBarcodes(image, {
    maxNumberOfSymbols: MAX_BARCODES,
  })

  const seen = new Set<string>()
  const barcodes: ScannedBarcode[] = []

  for (const result of results) {
    if (!result.isValid || result.format === 'None' || result.text === '') {
      continue
    }

    const format = zxing.formatToLabel(result.format) ?? result.format
    const key = `${format}\n${result.text}`
    if (seen.has(key)) continue

    seen.add(key)
    barcodes.push({ format, text: result.text })
  }

  return barcodes
}
