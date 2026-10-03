import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { connect } from 'node:net'
import { createHash } from 'node:crypto'
import { voiceUpgrade } from '../server.mjs'

const ADMIN = { name: 'Stefan Y', email: 's@example.com', roles: ['admin'] }
async function listen(server, t) {
  const sockets = new Set()
  server.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)) })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  t.after(() => { for (const s of sockets) s.destroy(); server.close() })
  return server.address().port
}
function handshake(port, path = '/jarvis-api/voice?conversation_id=c1', origin = 'https://cloud.example.com', extra = '') {
  const socket = connect(port, '127.0.0.1')
  socket.setTimeout(2000, () => socket.destroy(new Error('test timeout')))
  let data = Buffer.alloc(0)
  const response = new Promise((resolve, reject) => {
    socket.on('error', reject)
    socket.on('data', c => { data = Buffer.concat([data, c]); if (data.includes('\r\n\r\n')) resolve(data) })
  })
  socket.on('connect', () => socket.write(`GET ${path} HTTP/1.1\r\nHost: cloud.example.com\r\nOrigin: ${origin}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nX-Jarvis-User: forged@example.com\r\nX-Jarvis-Roles: admin\r\n${extra}\r\n`))
  return { socket, response }
}

test('voice upgrade rejects anonymous, unauthorized, cross-site and unexpected routes', async t => {
  for (const [user, path, origin, code] of [
    [null, undefined, undefined, 401],
    [{ ...ADMIN, roles: ['family'] }, undefined, undefined, 403],
    [ADMIN, '/jarvis-api/ask?conversation_id=c1', undefined, 404],
    [ADMIN, undefined, 'https://evil.example', 403],
    [ADMIN, '/jarvis-api/voice?conversation_id=../x', undefined, 400],
  ]) {
    const server = createServer()
    server.on('upgrade', voiceUpgrade({ userResolver: async () => user, rolesResolver: async () => ['admin'],
      jarvisUrl: 'http://127.0.0.1:1', jarvisToken: 'private-widget-token', publicUrl: 'https://cloud.example.com' }))
    const port = await listen(server, t)
    const h = handshake(port, path, origin)
    const reply = (await h.response).toString()
    assert.match(reply, new RegExp(`HTTP/1.1 ${code} `))
    assert.ok(!reply.includes('private-widget-token'))
    h.socket.destroy()
  }
})

test('upgrades forward trusted identity and tunnel bytes both ways', async t => {
  const upstream = createServer()
  let received
  upstream.on('upgrade', (req, socket, head) => {
    received = req
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)
    if (head.length) socket.write(head)
    socket.on('data', c => socket.write(c))
  })
  const upstreamPort = await listen(upstream, t)
  const honey = createServer()
  honey.on('upgrade', voiceUpgrade({ userResolver: async () => ADMIN, rolesResolver: async () => ['admin'],
    jarvisUrl: `http://127.0.0.1:${upstreamPort}`, jarvisToken: 'private-widget-token', publicUrl: 'https://cloud.example.com' }))
  const port = await listen(honey, t)
  const { socket, response } = handshake(port)
  assert.match((await response).toString(), /101 Switching Protocols/)
  assert.equal(received.url, '/widget/voice?conversation_id=c1')
  assert.equal(received.headers.authorization, 'Bearer private-widget-token')
  assert.equal(received.headers['x-jarvis-user'], ADMIN.email)
  assert.equal(received.headers['x-jarvis-name'], 'Stefan%20Y')
  const pcmFrame = Buffer.from([0x82, 0x02, 0, 1])
  const echoed = new Promise(r => socket.once('data', r))
  socket.write(pcmFrame)
  assert.deepEqual(await echoed, pcmFrame)
  socket.destroy()
})

test('upstream refusal becomes an HTTP error before upgrade', async t => {
  const upstream = createServer((req, res) => { res.writeHead(503); res.end() })
  const upstreamPort = await listen(upstream, t)
  const honey = createServer()
  honey.on('upgrade', voiceUpgrade({ userResolver: async () => ADMIN, rolesResolver: async () => ['admin'],
    jarvisUrl: `http://127.0.0.1:${upstreamPort}`, jarvisToken: 'token', publicUrl: 'https://cloud.example.com' }))
  const port = await listen(honey, t)
  const h = handshake(port)
  assert.match((await h.response).toString(), /503 Rejected/)
  h.socket.destroy()
})
