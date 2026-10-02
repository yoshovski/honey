// honey server: serves the built dashboard, shows each signed-in person only what their roles allow, and forwards
// the Jarvis widget's calls. No dependencies (Node 20+).
//
// Sign-in happens in front of it (oauth2-proxy with Zitadel). oauth2-proxy passes the OIDC ID token as
// `Authorization: Bearer …` (--pass-authorization-header); this server checks its signature against the issuer's keys,
// so a forged header gets nowhere even if something else could reach the container.
//
// Environment (all optional; without OIDC_ISSUER honey behaves like before: everything visible, no user):
//   PORT                 4173
//   OIDC_ISSUER          https://auth.yoshovski.com
//   OIDC_CLIENT_ID       the Zitadel app's client ID (the ID token's audience)
//   OIDC_ROLES_CLAIM     urn:zitadel:iam:org:project:roles (object, array or comma list)
//   PUBLIC_URL           https://cloud.yoshovski.com: "Sign out" also ends the Zitadel session and comes back here
//   LOGOUT_URL           overrides the sign-out link (default: oauth2-proxy sign-out → the issuer's end_session)
//   JARVIS_API_URL       Jarvis Core, e.g. http://100.88.90.8:8091 (tailnet); the widget is off without it
//   JARVIS_API_TOKEN     Core's CORE_TOKEN_WIDGET
//   HONEY_DEV_USER       local testing only, without OIDC: "Name <mail>|role1,role2"

import { createServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createPublicKey, verify } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const env = process.env
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const PORT = Number(env.PORT || 4173)
const ISSUER = (env.OIDC_ISSUER || '').replace(/\/+$/, '')
const CLIENT_ID = env.OIDC_CLIENT_ID || ''
const ROLES_CLAIM = env.OIDC_ROLES_CLAIM || 'urn:zitadel:iam:org:project:roles'
const PUBLIC_URL = (env.PUBLIC_URL || '').replace(/\/+$/, '')
const JARVIS_URL = (env.JARVIS_API_URL || '').replace(/\/+$/, '')
const JARVIS_TOKEN = env.JARVIS_API_TOKEN || ''
const JARVIS_PATHS = new Set(['me', 'overview', 'ask', 'decide', 'stt', 'tts', 'jarvis-widget.js'])
const MAX_BODY = 6 * 1024 * 1024
const TYPES = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
	'.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
}

if (ISSUER && !CLIENT_ID) {
	console.error('OIDC_ISSUER is set but OIDC_CLIENT_ID is not: every visitor will be anonymous')
}

// ---- OIDC: verify the ID token oauth2-proxy passes on --------------------------------------------------------------

let jwks = { keys: new Map(), fetched: 0, uri: '' }
let endSession = ''

async function discover() {
	const d = await (await fetch(`${ISSUER}/.well-known/openid-configuration`)).json()
	jwks.uri = d.jwks_uri
	endSession = d.end_session_endpoint || ''
}

/** oauth2-proxy drops its cookie, then the issuer ends the Zitadel session and sends the person back to PUBLIC_URL. */
function logoutUrl() {
	if (env.LOGOUT_URL) return env.LOGOUT_URL
	if (!endSession || !PUBLIC_URL) return '/oauth2/sign_out'
	const end = `${endSession}?client_id=${encodeURIComponent(CLIENT_ID)}&post_logout_redirect_uri=${encodeURIComponent(PUBLIC_URL + '/')}`
	return `/oauth2/sign_out?rd=${encodeURIComponent(end)}`
}

async function loadKeys(force = false) {
	if (!force && jwks.keys.size && Date.now() - jwks.fetched < 3600e3) return
	if (force && Date.now() - jwks.fetched < 60e3) return            // an unknown kid refetches at most once a minute
	if (!jwks.uri) await discover()
	const set = await (await fetch(jwks.uri)).json()
	jwks = { ...jwks, fetched: Date.now(), keys: new Map((set.keys || []).map((k) => [k.kid, k])) }
}

const b64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

export async function verifyIdToken(token, now = Date.now(), keyLoader = loadKeys, keys = () => jwks.keys) {
	const parts = String(token || '').split('.')
	if (parts.length !== 3) return null
	let header, claims
	try {
		header = JSON.parse(b64(parts[0]).toString('utf8'))
		claims = JSON.parse(b64(parts[1]).toString('utf8'))
	} catch { return null }
	const algs = { RS256: ['sha256', {}], RS384: ['sha384', {}], RS512: ['sha512', {}], ES256: ['sha256', { dsaEncoding: 'ieee-p1363' }] }
	if (!algs[header.alg]) return null
	await keyLoader()
	let jwk = keys().get(header.kid)
	if (!jwk) { await keyLoader(true); jwk = keys().get(header.kid) }
	if (!jwk) return null
	const [hash, opts] = algs[header.alg]
	const ok = verify(hash, Buffer.from(`${parts[0]}.${parts[1]}`), { key: createPublicKey({ key: jwk, format: 'jwk' }), ...opts }, b64(parts[2]))
	if (!ok) return null
	const aud = [].concat(claims.aud || [])
	if (String(claims.iss || '').replace(/\/+$/, '') !== ISSUER || !aud.includes(CLIENT_ID)) return null
	if (!claims.exp || claims.exp * 1000 < now - 60e3 || (claims.nbf && claims.nbf * 1000 > now + 60e3)) return null
	return claims
}

export function rolesOf(claims, claim = ROLES_CLAIM) {
	let v = claims[claim]
	if (v === undefined) {            // project-specific variant: urn:zitadel:iam:org:project:<id>:roles
		const k = Object.keys(claims).find((x) => /^urn:zitadel:iam:org:project:(\d+:)?roles$/.test(x))
		v = k ? claims[k] : undefined
	}
	const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : v && typeof v === 'object' ? Object.keys(v) : []
	return [...new Set(list.map((r) => String(r).trim().toLowerCase()).filter(Boolean))].sort()
}

function devUser() {
	const m = String(env.HONEY_DEV_USER || '').match(/^(.*?)\s*<([^>]+)>\s*\|\s*(.*)$/)
	return m ? { name: m[1], email: m[2], roles: m[3].split(',').map((r) => r.trim()).filter(Boolean) } : null
}

/** The signed-in person, `null` when anonymous. `false` = OIDC is off (legacy mode: everything visible). */
async function userOf(req) {
	if (!ISSUER) return devUser() || false
	const auth = String(req.headers.authorization || '')
	if (!auth.toLowerCase().startsWith('bearer ')) return null
	let claims = null
	try { claims = await verifyIdToken(auth.slice(7).trim()) } catch (e) { console.warn('id token check failed:', e.message) }
	if (!claims) return null
	return {
		name: claims.name || claims.given_name || claims.preferred_username || claims.email || 'You',
		email: claims.email || claims.preferred_username || claims.sub,
		roles: rolesOf(claims),
	}
}

// ---- config: each role sees its own services ------------------------------------------------------------------------

const allowed = (roles, user) => !roles || !roles.length || (user && roles.some((r) => user.roles.includes(String(r).toLowerCase())))

export function filterConfig(cfg, user, jarvisReady = Boolean(JARVIS_URL && JARVIS_TOKEN)) {
	const out = structuredClone(cfg)
	const auth = out.auth || {}
	delete out.auth
	const jarvisRoles = (out.jarvis && out.jarvis.roles) || ['admin']
	const strip = ({ roles, ...item }) => item
	if (user === false) {             // OIDC off: as before
		out.services = (out.services || []).map(strip)
		out.gear = (out.gear || []).map(strip)
		out.user = null
		out.jarvis = { enabled: false }
		return out
	}
	out.services = (out.services || []).filter((s) => allowed(s.roles, user)).map(strip)
	const admin = allowed(auth.admin_roles || ['admin'], user) && Boolean(user)
	out.gear = admin ? (out.gear || []).filter((s) => allowed(s.roles, user)).map(strip) : []
	out.user = user ? { name: user.name, email: user.email, roles: user.roles, logout: logoutUrl() } : null
	out.jarvis = { enabled: Boolean(jarvisReady && user && allowed(jarvisRoles, user)), script: '/jarvis-api/jarvis-widget.js' }
	return out
}

// ---- Jarvis: /jarvis-api/<x> → Core /widget/<x> -----------------------------------------------------------------------

async function jarvisRoles() {
	try {
		const cfg = JSON.parse(await readFile(join(ROOT, 'config', 'config.json'), 'utf8'))
		return (cfg.jarvis && cfg.jarvis.roles) || ['admin']
	} catch { return ['admin'] }
}

async function proxyJarvis(req, res, path, user) {
	if (!JARVIS_URL || !JARVIS_TOKEN) return send(res, 404, { error: 'Jarvis is not configured' })
	if (!user) return send(res, 401, { error: 'signed out' })
	if (!allowed(await jarvisRoles(), user)) return send(res, 403, { error: "Jarvis isn't enabled for your account." })
	if (!JARVIS_PATHS.has(path) || !['GET', 'POST'].includes(req.method)) return send(res, 404, { error: 'not found' })
	if (Number(req.headers['content-length'] || 0) > MAX_BODY) return send(res, 413, { error: 'too large' })
	const target = new URL(`${JARVIS_URL}/widget/${path}`)
	const headers = {
		authorization: `Bearer ${JARVIS_TOKEN}`,
		'x-jarvis-user': user.email,
		'x-jarvis-name': encodeURIComponent(user.name),
		'x-jarvis-roles': user.roles.join(','),
		accept: req.headers.accept || '*/*',
	}
	if (req.headers['content-type']) headers['content-type'] = req.headers['content-type']
	if (req.headers['content-length']) headers['content-length'] = req.headers['content-length']
	const up = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, { method: req.method, headers }, (r) => {
		const keep = ['content-type', 'cache-control', 'x-jarvis-voice', 'content-length']
		const h = Object.fromEntries(keep.filter((k) => r.headers[k]).map((k) => [k, r.headers[k]]))
		if (String(r.headers['content-type'] || '').startsWith('text/event-stream')) h['x-accel-buffering'] = 'no'
		res.writeHead(r.statusCode || 502, h)
		r.pipe(res)
	})
	up.setTimeout(310e3, () => up.destroy(new Error('timeout')))
	up.on('error', (e) => {
		console.warn('jarvis proxy:', e.message)
		if (!res.headersSent) send(res, 502, { error: "Jarvis didn't answer" })
		else res.destroy()
	})
	res.on('close', () => { if (!res.writableFinished) up.destroy() })
	let size = 0
	req.on('data', (c) => {
		size += c.length
		if (size > MAX_BODY) { up.destroy(); if (!res.headersSent) send(res, 413, { error: 'too large' }); req.destroy() }
	})
	req.pipe(up)
}

// ---- static files -----------------------------------------------------------------------------------------------------

function send(res, code, body, headers = {}) {
	const json = typeof body !== 'string'
	res.writeHead(code, { 'content-type': json ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...headers })
	res.end(json ? JSON.stringify(body) : body)
}

async function serveFile(res, path, cache) {
	const file = normalize(join(ROOT, path))
	if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden')
	try {
		const s = await stat(file)
		if (s.isDirectory()) return serveFile(res, join(path, 'index.html'), 'no-cache')
		res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': s.size, 'cache-control': cache })
		res.end(await readFile(file))
	} catch {
		send(res, 404, 'not found')
	}
}

async function serveConfig(req, res, path) {
	if (!/^\/config\/config(\.[a-z]{2})?\.json$/.test(path)) return serveFile(res, path, 'no-store')
	let cfg
	try { cfg = JSON.parse(await readFile(join(ROOT, path), 'utf8')) } catch { return send(res, 404, 'not found') }
	send(res, 200, filterConfig(cfg, await userOf(req)), { vary: 'authorization' })
}

const server = createServer(async (req, res) => {
	try {
		const url = new URL(req.url, 'http://honey')
		const path = decodeURIComponent(url.pathname)
		if (path === '/healthz') return send(res, 200, 'ok')
		if (path.startsWith('/jarvis-api/')) return proxyJarvis(req, res, path.slice('/jarvis-api/'.length), await userOf(req))
		if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed')
		if (path.startsWith('/config/')) return serveConfig(req, res, path)
		return serveFile(res, path === '/' ? '/index.html' : path, path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
	} catch (e) {
		console.error(e)
		if (!res.headersSent) send(res, 500, 'error')
	}
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	server.listen(PORT, () => console.log(`honey on :${PORT}${ISSUER ? `, sign-in by ${ISSUER}` : ', no sign-in (OIDC_ISSUER unset)'}${JARVIS_URL ? ', Jarvis on' : ''}`))
}
