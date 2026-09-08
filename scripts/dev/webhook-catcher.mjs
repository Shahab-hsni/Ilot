// Stands in for Mattermost and for WhatsApp sends in the local dev stack.
// Accepts any request, prints it, answers 200.
//
// From n8n:   http://webhook-catcher:4000/hook
// From host:  http://localhost:4000/hook
//
// The point is to see the exact JSON n8n emits, which the real Mattermost
// webhook would swallow.

import { createServer } from 'node:http'

const PORT = Number(process.env.PORT || 4000)

createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8')

    let body = raw
    try {
      body = JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      // not JSON — print as received
    }

    console.log(`\n${'='.repeat(72)}`)
    console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`)
    console.log('-'.repeat(72))
    for (const [k, v] of Object.entries(req.headers)) console.log(`${k}: ${v}`)
    if (raw) {
      console.log('-'.repeat(72))
      console.log(body)
    }
    console.log('='.repeat(72))

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, received: raw.length }))
  })
}).listen(PORT, '0.0.0.0', () => {
  console.log(`webhook-catcher listening on :${PORT}`)
})
