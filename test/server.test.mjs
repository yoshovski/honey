// node --test test/ : the ID-token check, roles, and what each role sees.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'

process.env.OIDC_ISSUER = 'https://auth.example.com'
process.env.OIDC_CLIENT_ID = 'honey-client'
const { verifyIdToken, rolesOf, filterConfig } = await import('../server.mjs')

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }
const keys = () => new Map([['k1', jwk]])
const noLoad = async () => {}
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const NOW = Date.UTC(2026, 9, 3, 12)
function token(claims, { kid = 'k1', key = privateKey } = {}) {
	const head = enc({ alg: 'RS256', kid, typ: 'JWT' })
	const body = enc({ iss: 'https://auth.example.com', aud: ['honey-client', 'project'], exp: NOW / 1000 + 3600, sub: '1', ...claims })
	return `${head}.${body}.${sign('sha256', Buffer.from(`${head}.${body}`), key).toString('base64url')}`
}
const check = (t) => verifyIdToken(t, NOW, noLoad, keys)

test('a token signed by the issuer for this app passes', async () => {
	const c = await check(token({ email: 'stefan@yoshovski.com' }))
	assert.equal(c.email, 'stefan@yoshovski.com')
})

test('forged, foreign or expired tokens are refused', async () => {
	const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
	assert.equal(await check(token({}, { key: other })), null)                    // wrong signature
	assert.equal(await check(token({}, { kid: 'nope' })), null)                    // unknown key
	assert.equal(await check(token({ aud: 'someone-else' })), null)
	assert.equal(await check(token({ iss: 'https://evil.example.com' })), null)
	assert.equal(await check(token({ exp: NOW / 1000 - 3600 })), null)
	assert.equal(await check('not.a.token'), null)
	const [h, b] = token({}).split('.')
	assert.equal(await check(`${h}.${enc({ ...JSON.parse(Buffer.from(b, 'base64url')), email: 'x@y' })}.${token({}).split('.')[2]}`), null)
})

test('roles come from the Zitadel claim in any shape', () => {
	assert.deepEqual(rolesOf({ 'urn:zitadel:iam:org:project:roles': { admin: { 1: 'x' }, Family: {} } }), ['admin', 'family'])
	assert.deepEqual(rolesOf({ 'urn:zitadel:iam:org:project:123:roles': { family: {} } }), ['family'])
	assert.deepEqual(rolesOf({ groups: ['admin'] }, 'groups'), ['admin'])
	assert.deepEqual(rolesOf({ roles: 'a, b' }, 'roles'), ['a', 'b'])
	assert.deepEqual(rolesOf({}), [])
})

const CFG = {
	ui: { name: 'honey' },
	auth: { admin_roles: ['admin'] },
	jarvis: { roles: ['admin'] },
	services: [{ name: 'Photos', href: '/p' }, { name: 'Grafana', href: '/g', roles: ['admin'] }, { name: 'Recipes', href: '/r', roles: ['family'] }],
	gear: [{ name: 'Portainer', href: '/x' }],
}
const ADMIN = { name: 'Stefan Y', email: 's@y', roles: ['admin'] }
const FAMILY = { name: 'Anna', email: 'a@y', roles: ['family'] }

test('each role sees its own services; only admins see the admin section and Jarvis', () => {
	const a = filterConfig(CFG, ADMIN, true)
	assert.deepEqual(a.services.map((s) => s.name), ['Photos', 'Grafana'])
	assert.deepEqual(a.gear.map((s) => s.name), ['Portainer'])
	assert.equal(a.jarvis.enabled, true)
	assert.equal(a.user.name, 'Stefan Y')
	assert.equal(a.auth, undefined)
	assert.equal(a.services[1].roles, undefined)                  // role lists never reach the browser

	const f = filterConfig(CFG, FAMILY, true)
	assert.deepEqual(f.services.map((s) => s.name), ['Photos', 'Recipes'])
	assert.deepEqual(f.gear, [])
	assert.equal(f.jarvis.enabled, false)

	const anon = filterConfig(CFG, null, true)
	assert.deepEqual(anon.services.map((s) => s.name), ['Photos'])
	assert.equal(anon.user, null)
	assert.equal(anon.jarvis.enabled, false)
})

test('Jarvis stays off without its URL and token; without OIDC everything shows as before', () => {
	assert.equal(filterConfig(CFG, ADMIN, false).jarvis.enabled, false)
	const legacy = filterConfig(CFG, false, true)
	assert.equal(legacy.services.length, 3)
	assert.equal(legacy.gear.length, 1)
	assert.equal(legacy.user, null)
})
