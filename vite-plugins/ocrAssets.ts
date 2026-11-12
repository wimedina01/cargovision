import { createReadStream, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { Plugin } from 'vite'

const requireFromHere = createRequire(import.meta.url)

/**
 * Tesseract loads its worker, WebAssembly core and language data by URL at
 * run time, and the language file must be named `<lang>.traineddata.gz` inside
 * a directory. Hashed bundler asset URLs cannot satisfy that, so the three
 * files are served (development) and emitted (build) under a fixed `/ocr/`
 * path. The service worker then precaches them for offline use.
 */
function resolveOcrFiles(): Map<string, string> {
  const tesseractManifest = requireFromHere.resolve('tesseract.js/package.json')
  const requireFromTesseract = createRequire(tesseractManifest)
  const coreManifest = requireFromTesseract.resolve(
    'tesseract.js-core/package.json',
  )
  const languageManifest = requireFromHere.resolve(
    '@tesseract.js-data/eng/package.json',
  )

  return new Map([
    [
      'worker.min.js',
      path.join(path.dirname(tesseractManifest), 'dist', 'worker.min.js'),
    ],
    [
      'tesseract-core-simd-lstm.wasm.js',
      path.join(path.dirname(coreManifest), 'tesseract-core-simd-lstm.wasm.js'),
    ],
    [
      'eng.traineddata.gz',
      path.join(
        path.dirname(languageManifest),
        '4.0.0_best_int',
        'eng.traineddata.gz',
      ),
    ],
  ])
}

const contentTypes: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.gz': 'application/gzip',
}

export function ocrAssets(): Plugin {
  return {
    name: 'cargovision-ocr-assets',

    configureServer(server) {
      const files = resolveOcrFiles()

      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0] ?? ''
        const match = /^\/ocr\/([^/]+)$/.exec(pathname)
        const file = match?.[1] ? files.get(match[1]) : undefined

        if (!file) {
          next()
          return
        }

        response.setHeader(
          'Content-Type',
          contentTypes[path.extname(file)] ?? 'application/octet-stream',
        )
        createReadStream(file).pipe(response)
      })
    },

    generateBundle() {
      for (const [name, file] of resolveOcrFiles()) {
        this.emitFile({
          type: 'asset',
          fileName: `ocr/${name}`,
          source: readFileSync(file),
        })
      }
    },
  }
}
