import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'

const fonts = [
  {
    name: 'Outfit (variable wght, latin)',
    url: 'https://fonts.gstatic.com/s/outfit/v15/QGYvz_MVcBeNP4NJtEtqUYLknw.woff2',
    out: 'Outfit[wght].woff2',
  },
  {
    name: 'Plus Jakarta Sans (variable wght, latin)',
    url: 'https://fonts.gstatic.com/s/plusjakartasans/v12/LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yygg_vb.woff2',
    out: 'PlusJakartaSans[wght].woff2',
  },
]

function requestBuffer(url, { timeoutMs = 30000, redirectsLeft = 3 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const lib = u.protocol === 'http:' ? http : https

    const req = lib.request(
      u,
      {
        method: 'GET',
        headers: { 'user-agent': 'PicHub-font-fetcher' },
        timeout: timeoutMs,
        family: 4,
      },
      (res) => {
        const status = res.statusCode || 0
        if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume()
          resolve(requestBuffer(new URL(res.headers.location, u).toString(), { timeoutMs, redirectsLeft: redirectsLeft - 1 }))
          return
        }
        if (status < 200 || status >= 300) {
          res.resume()
          reject(new Error(`HTTP ${status} for ${url}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      }
    )

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout after ${timeoutMs}ms for ${url}`))
    })
    req.on('error', reject)
    req.end()
  })
}

async function download(url) {
  return requestBuffer(url, { timeoutMs: 30000, redirectsLeft: 3 })
}

async function main() {
  const root = path.resolve(process.cwd(), 'public', 'fonts')
  await fs.mkdir(root, { recursive: true })

  for (const f of fonts) {
    const outPath = path.join(root, f.out)
    const buf = await download(f.url)
    await fs.writeFile(outPath, buf)
    // eslint-disable-next-line no-console
    console.log(`Downloaded ${f.name} -> ${path.relative(process.cwd(), outPath)} (${buf.length} bytes)`)
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exit(1)
})
